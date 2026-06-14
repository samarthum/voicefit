"use server";

/**
 * Meal interpretation: per-ingredient breakdown via an agentic tool loop
 * over USDA + IFCT + the user's previous meals.
 *
 * Two public entry points share the same nutrition-DB tool plumbing:
 *   - `interpretMeal`: full-meal decomposition for the voice/text logger.
 *     Adds `search_previous_meals` to the tool set.
 *   - `interpretIngredient`: single-row resolver for the ingredient edit
 *     UI (rename a row, add a new one). Narrower system prompt, smaller
 *     thinking budget, no `search_previous_meals`.
 *
 * Why per-ingredient rather than single-shot totals:
 *   - Accuracy: a meal is a sum of components, and any single-shot estimate
 *     hides where it gets the math wrong. Decomposing forces the model to
 *     anchor each component in a real portion + nutrient profile.
 *   - Auditability: when totals are off the user (and we) can see which
 *     ingredient drifted and edit just that line.
 *   - Editing UX: ingredient rows map directly to MealIngredient rows —
 *     users can tweak grams or macros per ingredient without re-running
 *     the model.
 *
 * Why extended thinking + an agentic tool loop, not a multi-step pipeline:
 *   - The steps aren't independent. Picking a USDA entry can change the
 *     portion estimate (raw vs cooked), and the IFCT result for paneer can
 *     reframe how we count the rest of a thali. A pipeline forces
 *     decisions before the model has the data to make them; an agent loop
 *     lets it revisit earlier estimates as tool results land.
 *   - Extended thinking gives us deliberate budget for that revisiting
 *     without bloating the surfaced text response.
 *
 * Why USDA + IFCT, not CalorieNinjas / Nutritionix / Edamam:
 *   - USDA FoodData Central is free, has transparent provenance
 *     (Foundation, SR Legacy, FNDDS, Branded), and exposes a search-first
 *     API that matches how the model already reasons (search → pick →
 *     fetch).
 *   - IFCT (ICMR-NIN, lab-analyzed) covers the South Asian gap where USDA
 *     is thin — paneer, ghee, atta, dals, regional produce.
 *   - Commercial NL endpoints were rejected: opaque sourcing, per-call
 *     pricing that scales poorly with an agent loop, and they hide the
 *     disambiguation step we want the model to do explicitly.
 *
 * Why Sonnet 4.6 (not Opus): meal logging is the highest-volume call in
 * the app. Sonnet's accuracy/cost tradeoff is the right one here; Opus is
 * reserved for places where the marginal accuracy is worth the cost.
 *
 * The agent loop uses `anthropic.messages.stream(...)` + `await
 * stream.finalMessage()` so we get on-the-wire SSE with extended thinking
 * + tools, leaving the door open for progressive-UI rendering later. The
 * aggregator preserves thinking blocks (text + signature) so they can be
 * echoed back verbatim on the next tool-result turn — required by the
 * extended-thinking + tool-use protocol.
 *
 * `interpretWorkoutSet` below is unchanged from the previous module and
 * lives in this file for historical reasons; it does not share the meal
 * agent's plumbing.
 */

import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { anthropic } from "@/lib/claude";
import { EXERCISES } from "@/lib/exercises";
import {
  mealIngredientSchema,
  mealInterpretationSchema,
  workoutSetInterpretationSchema,
} from "@/lib/validations";
import { searchUsda, getUsdaNutrients } from "@/lib/nutrition/usda";
import { lookupIfct } from "@/lib/nutrition/ifct";

const MEAL_SYSTEM_PROMPT = `You are a state-of-the-art nutrition reasoning system. Estimate the calories
and macros of a meal from a freeform description with the rigor of a
registered dietitian.

Tools are available. Use them thoroughly — there is no token budget pressure.

# APPROACH

Estimating a meal is a decomposition problem. Reason through it the way a
nutritionist would: identify the components, estimate portions, ground the
numbers in tool lookups where possible, and aggregate. The per-ingredient
breakdown is part of the answer — don't shortcut to totals.

Think carefully. Use tools liberally for any ingredient where authoritative
data would beat your own recall. Multiple tool calls per meal are expected.

# TOOLS

  - usda_search / usda_get_nutrients - USDA FoodData Central. Strong for
    whole foods, common ingredients, and US branded items. Search-first
    (search, pick the best match, then fetch details).
  - ifct_lookup - Indian Food Composition Tables (ICMR-NIN, lab-analyzed).
    Use where USDA coverage is thin - most often for South Asian
    ingredients like paneer, ghee, atta, dal, regional produce.
  - search_previous_meals - when the user references a prior meal
    ("same as yesterday", "the usual"), or to anchor a portion size to
    one they've already accepted.
  - web_search - live web lookup. Use for restaurant menu items,
    packaged/branded products, and chain-specific dishes whose nutrition
    isn't in USDA/IFCT. Search the brand's or restaurant's published
    nutrition figures and prefer official/manufacturer sources over blogs.
  - The user may provide a meal photo. Use the image as primary evidence
    for visible foods and portions, and use any text as disambiguating
    context.

If none of the tools cover an ingredient well, fall back to your own
knowledge. Just give your best estimate.

# THINGS TO WATCH FOR

These are the most common error sources across cuisines. Apply judgement,
not rules.

  - Cooked vs raw weights diverge meaningfully. Most database entries are
    raw; portions on a plate are cooked. Either pick the DB entry that
    matches the state of the food, or apply a yield factor - never both.
    Rough ratios: meat -25 % cooking, fish -15 to -20 %, rice +200 %
    raw to cooked, pasta +150 %.
  - Hidden fats - oil, butter, ghee, cream, mayo, dressings, sauces.
    These are the single largest source of underestimation, especially
    for restaurant and fried food. Surface them as explicit ingredients
    with realistic gram amounts rather than burying them in "the dish".
  - Restaurant portions and added fats generally run higher than home
    cooking. Account for this when context implies it.
  - Liquids count. Beverages, soups, dressings, broths.
  - People (and language models) systematically underestimate portions.
    When ambiguous, lean slightly high.
  - Fat is the macro most often miscounted. Don't dial fat down to make
    calories add up tidily.

# OUTPUT

After your reasoning, emit ONE JSON object matching this schema. No prose
before or after.

{
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "description": "concise human summary of the meal",
  "totalGrams": <number>,
  "ingredients": [
    {
      "name": "<string>",
      "grams": <number>,
      "calories": <integer>,
      "proteinG": <integer>,
      "carbsG": <integer>,
      "fatG": <integer>
    }
  ],
  "calories": <integer>,
  "proteinG": <integer>,
  "carbsG": <integer>,
  "fatG": <integer>
}

Totals MUST equal the sum of per-ingredient values, rounded to integers.`;

const INGREDIENT_SYSTEM_PROMPT = `You are estimating calories and macros for a single ingredient with the rigor
of a registered dietitian.

You have access to tools — use them. There is no token-budget pressure.

# APPROACH

- If the user provided a gram amount, use it. Otherwise pick a realistic
  serving size for that ingredient (e.g., 1 medium apple ~180 g, 1 slice
  of bread ~30 g, 1 cup cooked rice ~160 g) and report grams in your output.
- Look up authoritative nutrition data for the ingredient. Use ifct_lookup
  for South Asian items (paneer, ghee, atta, dal, regional produce);
  usda_search + usda_get_nutrients for everything else. For branded or
  restaurant items not in those databases, use web_search to find the
  brand's published figures (prefer official/manufacturer sources). Fall
  back to your own knowledge only if no tool has a good match.
- Cooked-vs-raw matters: pick the DB entry that matches the state implied
  by the ingredient name; never apply a yield factor on top of an entry
  that already represents that state.

# OUTPUT

After your reasoning, emit ONE JSON object matching this schema. No prose
before or after.

{
  "name": "<canonical ingredient name>",
  "grams": <number>,
  "calories": <integer>,
  "proteinG": <integer>,
  "carbsG": <integer>,
  "fatG": <integer>
}

Round calories and macros to integers.`;

const nutritionDbTools = {
  usda_search: tool({
    description:
      "Search USDA FoodData Central for foods matching a query. Returns up to N candidate foods with FDC IDs. Strong for whole foods, common ingredients, and US branded items. Specify state (raw/cooked) in the query when known — these are separate entries.",
    inputSchema: z.object({
      query: z.string(),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe("Number of results, default 5, max 25"),
    }),
    execute: async ({ query, pageSize }) => {
      return await searchUsda(query, pageSize);
    },
  }),
  usda_get_nutrients: tool({
    description:
      "Fetch full nutrient profile for a USDA food by fdcId. Returns calories, protein, carbs, fat. If `grams` is provided, values are scaled to that mass; otherwise per 100g.",
    inputSchema: z.object({
      fdcId: z.number().int(),
      grams: z
        .number()
        .optional()
        .describe("Optional. If provided, scales nutrient values to this gram amount."),
    }),
    execute: async ({ fdcId, grams }) => {
      return await getUsdaNutrients(fdcId, grams);
    },
  }),
  ifct_lookup: tool({
    description:
      "Look up ingredients in the Indian Food Composition Tables (ICMR-NIN, lab-analyzed). Use where USDA coverage is thin — most often for South Asian ingredients like paneer, ghee, atta, dal, regional produce. Returns top fuzzy matches with macros per 100g (or scaled to `grams` if provided).",
    inputSchema: z.object({
      query: z.string(),
      grams: z.number().optional(),
      limit: z.number().int().optional().describe("Max results, default 5"),
    }),
    execute: async ({ query, grams, limit }) => {
      return lookupIfct(query, { grams, limit });
    },
  }),
  // OpenAI native web search (provider-executed). Use for branded/restaurant
  // items whose nutrition isn't in USDA/IFCT — the model searches the brand's
  // published figures rather than guessing.
  web_search: openai.tools.webSearch({ searchContextSize: "medium" }),
};

function makeMealTools(userId: string, now: Date) {
  return {
    ...nutritionDbTools,
    search_previous_meals: tool({
      description:
        "Search the user's previously-logged meals (last 14 days). Use when the user references a prior meal ('same as yesterday', 'the usual') or to anchor a portion size to one they've accepted before. Returns description, macros, and ingredient breakdown.",
      inputSchema: z.object({
        similarTo: z
          .string()
          .optional()
          .describe("Fuzzy substring filter on description"),
        daysAgo: z
          .number()
          .int()
          .optional()
          .describe("Search window in days, default 14, max 30"),
        mealType: z
          .enum(["breakfast", "lunch", "dinner", "snack"])
          .optional(),
      }),
      execute: async ({ similarTo, daysAgo: daysAgoRaw, mealType }) => {
        const daysAgo = Math.min(Math.max(1, Math.floor(daysAgoRaw ?? 14)), 30);
        const since = new Date(now);
        since.setDate(since.getDate() - daysAgo);

        const meals = await prisma.mealLog.findMany({
          where: {
            userId,
            eatenAt: { gte: since, lte: now },
            interpretationStatus: { in: ["needs_review", "reviewed"] },
            calories: { not: null },
            ...(mealType ? { mealType } : {}),
            ...(similarTo
              ? { description: { contains: similarTo, mode: "insensitive" as const } }
              : {}),
          },
          orderBy: { eatenAt: "desc" },
          take: 5,
          include: { ingredients: { orderBy: { position: "asc" } } },
        });

        return meals.map((m) => ({
          description: m.description,
          mealType: m.mealType,
          eatenAt: m.eatenAt.toISOString(),
          calories: m.calories ?? 0,
          proteinG: m.proteinG ?? null,
          carbsG: m.carbsG ?? null,
          fatG: m.fatG ?? null,
          ingredients: m.ingredients.map((ing) => ({
            name: ing.name,
            grams: ing.grams,
            calories: ing.calories,
            proteinG: ing.proteinG,
            carbsG: ing.carbsG,
            fatG: ing.fatG,
          })),
        }));
      },
    }),
  };
}

const WORKOUT_SYSTEM_PROMPT = `You are a fitness coach assistant. Your task is to parse workout descriptions from voice input. You handle both resistance training (sets with reps and weight) and cardio/freeform exercises (duration-based activities).

Given a workout description, extract:
1. Exercise name - For resistance training, MUST map to one of the approved exercises. For cardio, use descriptive names like "Running", "Cycling", "Dancing", "Walking", etc.
2. Exercise type - "resistance" for weight/rep-based exercises, "cardio" for duration-based activities
3. For RESISTANCE exercises: number of repetitions (reps) and weight in kilograms
4. For CARDIO exercises: duration in minutes
5. Any relevant notes
6. Confidence score (0-1) for your interpretation
7. Assumptions made during interpretation

APPROVED RESISTANCE EXERCISES:
${EXERCISES.join(", ")}

CARDIO/FREEFORM EXERCISES (examples - not limited to):
Running, Walking, Jogging, Cycling, Swimming, Dancing, Hiking, Jump Rope, Rowing (cardio), Elliptical, Stair Climbing, Boxing, Kickboxing, Yoga, Pilates, Stretching, etc.

Guidelines:
- First determine if this is resistance training (reps/sets/weight) or cardio (duration-based)
- For resistance: Map to closest approved exercise name. Common mappings: "bench" -> "Bench Press", "squats" -> "Squat"
- For cardio: Use clear, descriptive names (capitalize first letters)
- If weight is in pounds, convert to kg (1 lb = 0.453592 kg, round to nearest 0.5 kg)
- "Empty barbell" typically means 20 kg - note in assumptions
- For resistance: If reps not mentioned, set to null. If weight not mentioned, set to null. Set durationMinutes to null.
- For cardio: Set reps and weightKg to null. Extract duration (convert hours to minutes if needed)

You MUST respond with valid JSON matching this exact schema:
{
  "exerciseName": "exercise name string",
  "exerciseType": "resistance" or "cardio",
  "reps": integer or null (for resistance only),
  "weightKg": number or null (for resistance only),
  "durationMinutes": integer or null (for cardio only),
  "notes": "any relevant notes" or null,
  "confidence": number between 0 and 1,
  "assumptions": ["array of assumptions made"]
}

Only output the JSON object, no other text.`;

interface InterpretMealInput {
  userId: string;
  transcript: string;
  mealType?: string;
  eatenAt?: string;
  image?: MealInterpretationImage;
}

export interface MealInterpretationImage {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  base64: string;
}

const MAX_AGENT_ITERATIONS = 10;


function extractJson(text: string): string {
  // Strip ```json … ``` or ``` … ``` fences if present, then trim.
  const fenced = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  // Some models prepend prose despite instructions; pull the largest {…} block.
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return fenced;
  return fenced.slice(start, end + 1);
}

function roundIntegerMacros(parsed: unknown): unknown {
  // The model is asked for integer macros but routinely emits floats.
  // Round to integers in place so the strict zod schema accepts them.
  if (!parsed || typeof parsed !== "object") return parsed;
  const obj = parsed as Record<string, unknown>;
  for (const k of ["calories", "proteinG", "carbsG", "fatG"]) {
    const v = obj[k];
    if (typeof v === "number") obj[k] = Math.round(v);
  }
  if (Array.isArray(obj.ingredients)) {
    obj.ingredients = obj.ingredients.map((ing) => {
      if (!ing || typeof ing !== "object") return ing;
      const ingObj = ing as Record<string, unknown>;
      for (const k of ["calories", "proteinG", "carbsG", "fatG"]) {
        const v = ingObj[k];
        if (typeof v === "number") ingObj[k] = Math.round(v);
      }
      return ingObj;
    });
  }
  return obj;
}

export async function interpretMeal({
  userId,
  transcript,
  mealType,
  eatenAt,
  image,
}: InterpretMealInput) {
  const timestamp = eatenAt ? new Date(eatenAt) : new Date();
  const timeStr = timestamp.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = timestamp.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const contextParts: string[] = [`Time: ${dateStr} at ${timeStr}`];
  if (mealType) contextParts.push(`Meal type: ${mealType}`);
  const userText = `[${contextParts.join(", ")}] ${transcript}`;

  const userContent = image
    ? [
        { type: "text" as const, text: userText },
        {
          type: "image" as const,
          image: `data:${image.mediaType};base64,${image.base64}`,
        },
      ]
    : userText;

  const { text, steps } = await generateText({
    model: "openai/gpt-5.5",
    system: MEAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    tools: makeMealTools(userId, timestamp),
    stopWhen: stepCountIs(MAX_AGENT_ITERATIONS),
    providerOptions: {
      openai: { reasoningEffort: "medium" },
    },
  });

  if (!text) {
    throw new Error("Meal interpretation: model returned no text.");
  }

  let interpretation: unknown;
  try {
    interpretation = JSON.parse(extractJson(text));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Meal interpretation: failed to parse JSON (${detail}). Raw: ${text.slice(0, 500)}`);
  }

  const rounded = roundIntegerMacros(interpretation);

  const validation = mealInterpretationSchema.safeParse(rounded);
  if (!validation.success) {
    throw new Error(
      `Meal interpretation: schema validation failed: ${JSON.stringify(validation.error.issues)}`,
    );
  }

  if (process.env.DEBUG_MEAL_INTERPRETATION === "1") {
    console.log(`[interpretMeal] steps=${steps.length}`);
  }

  return validation.data;
}

interface InterpretIngredientInput {
  name: string;
  grams?: number;
}

export async function interpretIngredient({
  name,
  grams,
}: InterpretIngredientInput) {
  const userMessage =
    typeof grams === "number"
      ? `Ingredient: ${name}\nAmount: ${grams} g`
      : `Ingredient: ${name}\nAmount: (not specified — pick a realistic serving)`;

  const { text, steps } = await generateText({
    model: "openai/gpt-5.5",
    system: INGREDIENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools: nutritionDbTools,
    stopWhen: stepCountIs(MAX_AGENT_ITERATIONS),
    providerOptions: {
      openai: { reasoningEffort: "medium" },
    },
  });

  if (!text) {
    throw new Error("Ingredient interpretation: model returned no text.");
  }

  let interpretation: unknown;
  try {
    interpretation = JSON.parse(extractJson(text));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Ingredient interpretation: failed to parse JSON (${detail}). Raw: ${text.slice(0, 500)}`,
    );
  }

  const rounded = roundIntegerMacros(interpretation);

  const validation = mealIngredientSchema.safeParse(rounded);
  if (!validation.success) {
    throw new Error(
      `Ingredient interpretation: schema validation failed: ${JSON.stringify(validation.error.issues)}`,
    );
  }

  if (process.env.DEBUG_MEAL_INTERPRETATION === "1") {
    console.log(`[interpretIngredient] steps=${steps.length}`);
  }

  return validation.data;
}

interface InterpretWorkoutSetInput {
  transcript: string;
}

export async function interpretWorkoutSet({ transcript }: InterpretWorkoutSetInput) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: WORKOUT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcript }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const content = textBlock && textBlock.type === "text" ? textBlock.text : null;

  if (!content) {
    throw new Error("Failed to interpret workout set. Please try again.");
  }

  let interpretation: unknown;
  try {
    const cleanedContent = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    interpretation = JSON.parse(cleanedContent);
  } catch {
    throw new Error("Failed to parse interpretation. Please try again.");
  }

  const validationResult = workoutSetInterpretationSchema.safeParse(interpretation);
  if (!validationResult.success) {
    throw new Error("Invalid interpretation format. Please try again.");
  }

  return validationResult.data;
}
