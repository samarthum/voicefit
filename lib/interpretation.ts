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

import type {
  ContentBlock,
  ContentBlockParam,
  MessageParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
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

Extended thinking is enabled. Tools are available. There is no token budget
pressure — be thorough.

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

You have extended thinking enabled and access to tools — use them. There is
no token-budget pressure.

# APPROACH

- If the user provided a gram amount, use it. Otherwise pick a realistic
  serving size for that ingredient (e.g., 1 medium apple ~180 g, 1 slice
  of bread ~30 g, 1 cup cooked rice ~160 g) and report grams in your output.
- Look up authoritative nutrition data for the ingredient. Use ifct_lookup
  for South Asian items (paneer, ghee, atta, dal, regional produce);
  usda_search + usda_get_nutrients for everything else. Fall back to your
  own knowledge only if the tools have no good match.
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

// Shared nutrition-database tools used by both meal and ingredient agents.
// Kept as a separate const so we can compose meal-specific tools on top
// without duplicating these schemas.
const NUTRITION_DB_TOOLS = [
  {
    name: "usda_search",
    description:
      "Search USDA FoodData Central for foods matching a query. Returns up to N candidate foods with FDC IDs. Strong for whole foods, common ingredients, and US branded items. Specify state (raw/cooked) in the query when known — these are separate entries.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const },
        pageSize: {
          type: "integer" as const,
          description: "Number of results, default 5, max 25",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "usda_get_nutrients",
    description:
      "Fetch full nutrient profile for a USDA food by fdcId. Returns calories, protein, carbs, fat. If `grams` is provided, values are scaled to that mass; otherwise per 100g.",
    input_schema: {
      type: "object" as const,
      properties: {
        fdcId: { type: "integer" as const },
        grams: {
          type: "number" as const,
          description: "Optional. If provided, scales nutrient values to this gram amount.",
        },
      },
      required: ["fdcId"],
    },
  },
  {
    name: "ifct_lookup",
    description:
      "Look up ingredients in the Indian Food Composition Tables (ICMR-NIN, lab-analyzed). Use where USDA coverage is thin — most often for South Asian ingredients like paneer, ghee, atta, dal, regional produce. Returns top fuzzy matches with macros per 100g (or scaled to `grams` if provided).",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const },
        grams: { type: "number" as const },
        limit: {
          type: "integer" as const,
          description: "Max results, default 5",
        },
      },
      required: ["query"],
    },
  },
];

const MEAL_TOOLS = [
  ...NUTRITION_DB_TOOLS,
  {
    name: "search_previous_meals",
    description:
      "Search the user's previously-logged meals (last 14 days). Use when the user references a prior meal ('same as yesterday', 'the usual') or to anchor a portion size to one they've accepted before. Returns description, macros, and ingredient breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        similarTo: {
          type: "string" as const,
          description: "Fuzzy substring filter on description",
        },
        daysAgo: {
          type: "integer" as const,
          description: "Search window in days, default 14, max 30",
        },
        mealType: {
          type: "string" as const,
          enum: ["breakfast", "lunch", "dinner", "snack"],
        },
      },
    },
  },
];

const INGREDIENT_TOOLS = NUTRITION_DB_TOOLS;

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
}

const MAX_AGENT_ITERATIONS = 10;

interface PreviousMealResult {
  description: string;
  mealType: string;
  eatenAt: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  ingredients: {
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }[];
}

// Shared executor for nutrition-DB tools. Returns null if `name` isn't one
// of the nutrition tools so callers can fall through to their own cases.
async function executeNutritionTool(
  name: string,
  input: unknown,
): Promise<{ content: string; isError: boolean } | null> {
  try {
    switch (name) {
      case "usda_search": {
        const { query, pageSize } = (input ?? {}) as {
          query?: string;
          pageSize?: number;
        };
        if (!query) throw new Error("usda_search requires `query`");
        const result = await searchUsda(query, pageSize);
        return { content: JSON.stringify(result), isError: false };
      }
      case "usda_get_nutrients": {
        const { fdcId, grams } = (input ?? {}) as {
          fdcId?: number;
          grams?: number;
        };
        if (typeof fdcId !== "number") {
          throw new Error("usda_get_nutrients requires `fdcId` (integer)");
        }
        const result = await getUsdaNutrients(fdcId, grams);
        return { content: JSON.stringify(result), isError: false };
      }
      case "ifct_lookup": {
        const { query, grams, limit } = (input ?? {}) as {
          query?: string;
          grams?: number;
          limit?: number;
        };
        if (!query) throw new Error("ifct_lookup requires `query`");
        const result = lookupIfct(query, { grams, limit });
        return { content: JSON.stringify(result), isError: false };
      }
      default:
        return null;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: JSON.stringify({ error: message }), isError: true };
  }
}

async function executeMealTool(
  name: string,
  input: unknown,
  ctx: { userId: string; now: Date },
): Promise<{ content: string; isError: boolean }> {
  const shared = await executeNutritionTool(name, input);
  if (shared) return shared;

  try {
    switch (name) {
      case "search_previous_meals": {
        const {
          similarTo,
          daysAgo: daysAgoRaw,
          mealType,
        } = (input ?? {}) as {
          similarTo?: string;
          daysAgo?: number;
          mealType?: string;
        };
        const daysAgo = Math.min(Math.max(1, Math.floor(daysAgoRaw ?? 14)), 30);
        const since = new Date(ctx.now);
        since.setDate(since.getDate() - daysAgo);

        const meals = await prisma.mealLog.findMany({
          where: {
            userId: ctx.userId,
            eatenAt: { gte: since, lte: ctx.now },
            ...(mealType ? { mealType } : {}),
            ...(similarTo
              ? { description: { contains: similarTo, mode: "insensitive" as const } }
              : {}),
          },
          orderBy: { eatenAt: "desc" },
          take: 5,
          include: {
            ingredients: { orderBy: { position: "asc" } },
          },
        });

        const shaped: PreviousMealResult[] = meals.map((m) => ({
          description: m.description,
          mealType: m.mealType,
          eatenAt: m.eatenAt.toISOString(),
          calories: m.calories,
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

        return { content: JSON.stringify(shaped), isError: false };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: JSON.stringify({ error: message }), isError: true };
  }
}

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
  const userMessage = `[${contextParts.join(", ")}] ${transcript}`;

  // Conversation accumulator. We append the assistant's content (verbatim,
  // including thinking blocks) and a tool_result user message each iteration.
  const messages: MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  let finalText: string | null = null;

  while (iterations < MAX_AGENT_ITERATIONS) {
    iterations++;

    // Streaming: `messages.stream(...)` returns a MessageStream whose
    // `finalMessage()` aggregator preserves thinking blocks (text + signature)
    // intact, so we can echo the assistant's content array back verbatim on the
    // next tool-result turn — required by the extended-thinking + tool-use
    // protocol. We don't surface tokens to the caller right now; the endpoint
    // still returns a single JSON. Hooking up progressive-UI rendering would
    // mean tapping the stream's event emitters here.
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      thinking: { type: "enabled", budget_tokens: 4096 },
      system: MEAL_SYSTEM_PROMPT,
      messages,
      tools: MEAL_TOOLS,
    });
    const response = await stream.finalMessage();
    const content: ContentBlock[] = response.content;

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      const textBlock = content.find((b) => b.type === "text");
      finalText = textBlock && textBlock.type === "text" ? textBlock.text : null;
      break;
    }

    if (response.stop_reason !== "tool_use") {
      throw new Error(
        `Meal interpretation: unexpected stop_reason "${response.stop_reason}".`,
      );
    }

    const toolUses = content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      throw new Error("Meal interpretation: stop_reason=tool_use but no tool_use blocks.");
    }

    // CRITICAL: pass the assistant's full content array back verbatim,
    // INCLUDING thinking + redacted_thinking blocks. Anthropic's extended
    // thinking + tool use protocol requires this; stripping them errors out.
    messages.push({ role: "assistant", content });

    const toolResults: ContentBlockParam[] = [];
    for (const tu of toolUses) {
      const { content: resultText, isError } = await executeMealTool(
        tu.name,
        tu.input,
        { userId, now: timestamp },
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: resultText,
        is_error: isError,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  if (iterations >= MAX_AGENT_ITERATIONS && finalText === null) {
    throw new Error(
      `Meal interpretation: agent loop exceeded ${MAX_AGENT_ITERATIONS} iterations without producing a final answer.`,
    );
  }

  if (!finalText) {
    throw new Error("Meal interpretation: model returned no text block.");
  }

  let interpretation: unknown;
  try {
    interpretation = JSON.parse(extractJson(finalText));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Meal interpretation: failed to parse JSON (${detail}). Raw: ${finalText.slice(0, 500)}`);
  }

  const rounded = roundIntegerMacros(interpretation);

  const validation = mealInterpretationSchema.safeParse(rounded);
  if (!validation.success) {
    throw new Error(
      `Meal interpretation: schema validation failed: ${JSON.stringify(validation.error.issues)}`,
    );
  }

  // Surface iteration count for caller-side telemetry without changing the
  // public return shape (validation.data matches MealInterpretation).
  if (process.env.DEBUG_MEAL_INTERPRETATION === "1") {
    // eslint-disable-next-line no-console
    console.log(`[interpretMeal] iterations=${iterations}`);
  }

  return validation.data;
}

interface InterpretIngredientInput {
  name: string;
  grams?: number;
}

/**
 * Single-ingredient agent — narrower scope than `interpretMeal`. Used by the
 * mobile review sheet when a user renames a row or adds a new ingredient
 * mid-edit. Same tool plumbing (USDA + IFCT, agentic loop, extended
 * thinking) but no `search_previous_meals` and a smaller thinking budget.
 */
export async function interpretIngredient({
  name,
  grams,
}: InterpretIngredientInput) {
  const userMessage =
    typeof grams === "number"
      ? `Ingredient: ${name}\nAmount: ${grams} g`
      : `Ingredient: ${name}\nAmount: (not specified — pick a realistic serving)`;

  const messages: MessageParam[] = [{ role: "user", content: userMessage }];

  let iterations = 0;
  let finalText: string | null = null;

  while (iterations < MAX_AGENT_ITERATIONS) {
    iterations++;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      thinking: { type: "enabled", budget_tokens: 2048 },
      system: INGREDIENT_SYSTEM_PROMPT,
      messages,
      tools: INGREDIENT_TOOLS,
    });
    const response = await stream.finalMessage();
    const content: ContentBlock[] = response.content;

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      const textBlock = content.find((b) => b.type === "text");
      finalText = textBlock && textBlock.type === "text" ? textBlock.text : null;
      break;
    }

    if (response.stop_reason !== "tool_use") {
      throw new Error(
        `Ingredient interpretation: unexpected stop_reason "${response.stop_reason}".`,
      );
    }

    const toolUses = content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      throw new Error(
        "Ingredient interpretation: stop_reason=tool_use but no tool_use blocks.",
      );
    }

    // Echo assistant content (incl. thinking + signatures) verbatim — required
    // by extended-thinking + tool-use protocol.
    messages.push({ role: "assistant", content });

    const toolResults: ContentBlockParam[] = [];
    for (const tu of toolUses) {
      const result = await executeNutritionTool(tu.name, tu.input);
      const { content: resultText, isError } = result ?? {
        content: JSON.stringify({ error: `Unknown tool: ${tu.name}` }),
        isError: true,
      };
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: resultText,
        is_error: isError,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  if (iterations >= MAX_AGENT_ITERATIONS && finalText === null) {
    throw new Error(
      `Ingredient interpretation: agent loop exceeded ${MAX_AGENT_ITERATIONS} iterations without producing a final answer.`,
    );
  }

  if (!finalText) {
    throw new Error("Ingredient interpretation: model returned no text block.");
  }

  let interpretation: unknown;
  try {
    interpretation = JSON.parse(extractJson(finalText));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Ingredient interpretation: failed to parse JSON (${detail}). Raw: ${finalText.slice(0, 500)}`,
    );
  }

  // Round macros to integers (the model is asked for integers but routinely
  // emits floats). Reuse the same in-place helper as the meal path — for a
  // single object the `ingredients` branch is a no-op.
  const rounded = roundIntegerMacros(interpretation);

  const validation = mealIngredientSchema.safeParse(rounded);
  if (!validation.success) {
    throw new Error(
      `Ingredient interpretation: schema validation failed: ${JSON.stringify(validation.error.issues)}`,
    );
  }

  if (process.env.DEBUG_MEAL_INTERPRETATION === "1") {
    // eslint-disable-next-line no-console
    console.log(`[interpretIngredient] iterations=${iterations}`);
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
