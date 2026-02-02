import { openai } from "@/lib/openai";
import { getAssistantData, getPreviousRange, getRange } from "@/lib/assistant/data";
import { buildAssistantPrompt, ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/prompts";
import { computeSummary } from "@/lib/assistant/metrics";

export const DEFAULT_RANGE_DAYS = 7;

const WRITE_INTENT_PATTERNS: RegExp[] = [
  /\b(log|add|update|edit|delete|remove|set|save|record|track)\b/i,
  /\b(i|today|yesterday)\s+(ate|had|weighed|ran|walked|logged)\b/i,
  /\b(steps|weight|calories|kcal)\b\s*[:=]?\s*\d[\d,]*/i,
];

const isWriteIntent = (message: string) =>
  WRITE_INTENT_PATTERNS.some((pattern) => pattern.test(message));

export interface AssistantChatResult {
  answer: string;
  dataUsed: {
    range: { start: string; end: string };
    sources: Array<"meals" | "daily_metrics" | "workouts">;
    counts: { meals: number; metrics: number; workouts: number };
  };
  summary: {
    period: { start: string; end: string };
    previousPeriod: { start: string; end: string };
    totals: {
      calories: number;
      steps: number | null;
      workouts: number;
      weightAvgKg: number | null;
      weightChangeKg: number | null;
    };
    deltas: {
      calories: number | null;
      steps: number | null;
      workouts: number | null;
      weightAvgKg: number | null;
      weightChangeKg: number | null;
    };
  };
  followUps: string[];
  readOnlyNotice?: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    followUps: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: ["answer", "followUps"],
};

export async function runAssistantChat(input: {
  userId: string;
  message: string;
  timezone?: string;
}): Promise<AssistantChatResult> {
  const range = getRange(DEFAULT_RANGE_DAYS, input.timezone);
  const previousRange = getPreviousRange(range, input.timezone);

  const [currentData, previousData] = await Promise.all([
    getAssistantData(input.userId, range),
    getAssistantData(input.userId, previousRange),
  ]);

  const summary = computeSummary(currentData, previousData, range, previousRange);
  const sources: Array<"meals" | "daily_metrics" | "workouts"> = [
    "meals",
    "daily_metrics",
    "workouts",
  ];
  const dataUsed = {
    range: { start: range.start, end: range.end },
    sources,
    counts: {
      meals: currentData.meals.length,
      metrics: currentData.metrics.length,
      workouts: currentData.workouts.length,
    },
  };

  if (isWriteIntent(input.message)) {
    return {
      answer:
        "I can’t edit or log entries yet, but you can use the Log Meal, Log Workout, or Metrics screens to add data.",
      dataUsed,
      summary: {
        period: { start: summary.period.start, end: summary.period.end },
        previousPeriod: {
          start: summary.previousPeriod.start,
          end: summary.previousPeriod.end,
        },
        totals: summary.totals,
        deltas: summary.deltas,
      },
      followUps: ["Summarize my week", "How is my calorie trend?", "Weight trend lately"],
      readOnlyNotice: "Read‑only mode",
    };
  }

  const prompt = buildAssistantPrompt({
    question: input.message,
    summary,
    currentData,
    previousData,
  });

  const response = await openai.responses.create({
    model: "gpt-5.2",
    input: [
      { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "assistant_response",
        schema: RESPONSE_SCHEMA,
        strict: true,
      },
    },
    store: false,
  });

  const outputText =
    (response as { output_text?: string }).output_text ??
    (response as { output?: Array<{ content?: Array<{ type: string; text?: string }> }> }).output?.[0]
      ?.content?.find((item) => item.type === "output_text")?.text ??
    (response as { output?: Array<{ content?: Array<{ type: string; text?: string }> }> }).output?.[0]
      ?.content?.find((item) => item.type === "text")?.text;
  if (!outputText) {
    throw new Error("Empty response from assistant");
  }

  let parsed: { answer: string; followUps: string[] } | null = null;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("Failed to parse assistant response");
  }

  if (!parsed) {
    throw new Error("Assistant response was empty");
  }

  return {
    answer: parsed.answer,
    dataUsed,
    summary: {
      period: { start: summary.period.start, end: summary.period.end },
      previousPeriod: {
        start: summary.previousPeriod.start,
        end: summary.previousPeriod.end,
      },
      totals: summary.totals,
      deltas: summary.deltas,
    },
    followUps: parsed.followUps ?? [],
  };
}
