import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  getCurrentUser,
} from "@/lib/api-helpers";
import {
  interpretEntryRequestSchema,
  intentClassificationSchema,
} from "@/lib/validations";
import { interpretMeal, interpretWorkoutSet } from "@/lib/interpretation";
import { prisma } from "@/lib/db";
import { getLastNDays } from "@/lib/timezone";
import { anthropic } from "@/lib/claude";

const CLASSIFIER_PROMPT = `You are an intent classifier for a health tracking app.

Classify the user's message into exactly one intent:
- "meal": logging food or drinks eaten
- "workout_set": logging an exercise set or cardio activity
- "weight": logging body weight
- "steps": logging step count
- "question": asking a question about past logs or metrics

Return valid JSON in this format:
{
  "intent": "meal" | "workout_set" | "weight" | "steps" | "question",
  "confidence": number between 0 and 1,
  "weightKg": number or null,
  "steps": integer or null,
  "assumptions": ["array of assumptions made"]
}

Rules:
- If intent is "weight", extract the body weight value. Convert pounds to kg (1 lb = 0.453592). Round to 1 decimal.
- If intent is "steps", extract the step count. Support shorthand like "10k" or "10,000".
- For other intents, set weightKg and steps to null.
- Only output the JSON object and nothing else.`;

const QUESTION_PROMPT = `You are a health tracking assistant. Answer the user's question using the provided data.
- Be concise (1-3 sentences).
- If the answer isn't available, say you don't have enough data yet.
- Do not invent values.

User question: {{question}}

Meals (most recent first):
{{meals}}

Daily metrics (most recent first):
{{metrics}}

Workouts (most recent first):
{{workouts}}

Answer:`;

type QuestionContext = {
  meals: string;
  metrics: string;
  workouts: string;
};

function buildWorkoutSystemText(input: {
  exerciseName: string;
  exerciseType: "resistance" | "cardio";
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
}) {
  const details: string[] = [];
  if (input.exerciseType === "cardio") {
    if (input.durationMinutes !== null && input.durationMinutes !== undefined) {
      details.push(`${input.durationMinutes} min`);
    }
  } else {
    if (input.reps !== null && input.reps !== undefined) {
      details.push(`${input.reps} reps`);
    }
    if (input.weightKg !== null && input.weightKg !== undefined) {
      details.push(`${input.weightKg} kg`);
    }
  }
  const detailText = details.length ? ` · ${details.join(" · ")}` : "";
  return `Logged ${input.exerciseName}${detailText}`;
}

async function buildQuestionContext(
  userId: string,
  timezone?: string
): Promise<QuestionContext> {
  const resolvedTimezone = timezone || "UTC";
  const last7Days = getLastNDays(7, resolvedTimezone);
  const startDate = new Date(last7Days[0] + "T00:00:00.000Z");
  const endDate = new Date(last7Days[last7Days.length - 1] + "T23:59:59.999Z");

  const [meals, metrics, sessions] = await Promise.all([
    prisma.mealLog.findMany({
      where: {
        userId,
        eatenAt: { gte: startDate, lte: endDate },
      },
      orderBy: { eatenAt: "desc" },
      take: 20,
      select: {
        eatenAt: true,
        mealType: true,
        description: true,
        calories: true,
      },
    }),
    prisma.dailyMetric.findMany({
      where: {
        userId,
        date: { in: last7Days },
      },
      orderBy: { date: "desc" },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        _count: { select: { sets: true } },
      },
    }),
  ]);

  const mealsText = meals.length
    ? meals
        .map((meal) => {
          const date = meal.eatenAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const time = meal.eatenAt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          return `${date} ${time} · ${meal.mealType} · ${meal.description} (${meal.calories} kcal)`;
        })
        .join("\n")
    : "No meals logged.";

  const metricsText = metrics.length
    ? metrics
        .map((metric) => {
          const steps =
            metric.steps !== null && metric.steps !== undefined ? metric.steps : "n/a";
          const weight =
            metric.weightKg !== null && metric.weightKg !== undefined
              ? `${metric.weightKg} kg`
              : "n/a";
          return `${metric.date} · steps ${steps} · weight ${weight}`;
        })
        .join("\n")
    : "No daily metrics logged.";

  const workoutsText = sessions.length
    ? sessions
        .map((session) => {
          const date = session.startedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const time = session.startedAt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          return `${date} ${time} · ${session.title} · ${session._count.sets} sets`;
        })
        .join("\n")
    : "No workouts logged.";

  return {
    meals: mealsText,
    metrics: metricsText,
    workouts: workoutsText,
  };
}

async function answerQuestion(userId: string, question: string, timezone?: string) {
  const context = await buildQuestionContext(userId, timezone);
  const prompt = QUESTION_PROMPT.replace("{{question}}", question)
    .replace("{{meals}}", context.meals)
    .replace("{{metrics}}", context.metrics)
    .replace("{{workouts}}", context.workouts);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : null;

  if (!text) {
    throw new Error("Failed to answer question. Please try again.");
  }

  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

    const user = await getCurrentUser();
    const body = await request.json();
    const parseResult = interpretEntryRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { transcript, timezone } = parseResult.data;

    const classificationResult = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: CLASSIFIER_PROMPT,
      messages: [{ role: "user", content: transcript }],
    });

    const textBlock = classificationResult.content.find((block) => block.type === "text");
    const classificationText =
      textBlock && textBlock.type === "text" ? textBlock.text : null;

    if (!classificationText) {
      return errorResponse("Failed to classify entry. Please try again.", 500);
    }

    let classification: unknown;
    try {
      const cleaned = classificationText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      classification = JSON.parse(cleaned);
    } catch {
      return errorResponse("Failed to parse classification. Please try again.", 500);
    }

    const classificationValidation = intentClassificationSchema.safeParse(classification);
    if (!classificationValidation.success) {
      return errorResponse("Invalid classification format. Please try again.", 500);
    }

    const { intent, weightKg, steps, confidence, assumptions } =
      classificationValidation.data;

    if (intent === "meal") {
      const interpretation = await interpretMeal({
        userId: user.id,
        transcript,
      });
      return successResponse({
        intent,
        payload: interpretation,
        systemDraft: `Logged ${interpretation.description} · ${interpretation.calories} kcal`,
      });
    }

    if (intent === "workout_set") {
      const interpretation = await interpretWorkoutSet({ transcript });
      return successResponse({
        intent,
        payload: interpretation,
        systemDraft: buildWorkoutSystemText(interpretation),
      });
    }

    if (intent === "weight") {
      if (weightKg === null || weightKg === undefined) {
        return errorResponse("Unable to extract a weight value. Please try again.", 422);
      }
      return successResponse({
        intent,
        payload: {
          value: weightKg,
          confidence,
          assumptions,
          unit: "kg",
        },
        systemDraft: `Saved weight ${weightKg} kg`,
      });
    }

    if (intent === "steps") {
      if (steps === null || steps === undefined) {
        return errorResponse("Unable to extract a step count. Please try again.", 422);
      }
      return successResponse({
        intent,
        payload: {
          value: steps,
          confidence,
          assumptions,
          unit: "steps",
        },
        systemDraft: `Saved ${steps.toLocaleString()} steps`,
      });
    }

    const answer = await answerQuestion(user.id, transcript, timezone);
    return successResponse({
      intent: "question",
      payload: { answer },
      systemDraft: answer,
    });
  } catch (error) {
    console.error("Interpret entry error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to interpret entry. Please try again.";
    return errorResponse(message, 500);
  }
}
