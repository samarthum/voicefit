import { openai } from "@/lib/openai";
import { getAssistantData, getPreviousRange, getRange } from "@/lib/assistant/data";
import { buildAssistantPrompt, ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/prompts";
import { computeSummary } from "@/lib/assistant/metrics";

export const DEFAULT_RANGE_DAYS = 7;
const EXTENDED_RANGE_DAYS = 28;

const WRITE_INTENT_PATTERNS: RegExp[] = [
  /\b(log|add|update|edit|delete|remove|set|save|record|track)\b/i,
  /\b(i|today|yesterday)\s+(ate|had|weighed|ran|walked|logged)\b/i,
  /\b(steps|weight|calories|kcal)\b\s*[:=]?\s*\d[\d,]*/i,
];

const isWriteIntent = (message: string) =>
  WRITE_INTENT_PATTERNS.some((pattern) => pattern.test(message));

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getWeekdayFromText = (message: string): string | null => {
  const match = WEEKDAY_NAMES.find((day) =>
    new RegExp(`\\b${day}\\b`, "i").test(message)
  );
  return match ?? null;
};

const getTomorrowWeekday = (timezone?: string) => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return tomorrow.toLocaleDateString("en-US", { weekday: "long", timeZone: timezone });
};

const needsWeekdayContext = (message: string) =>
  /\btomorrow\b|\bnext\b|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b|\bsaturday\b|\bsunday\b/i.test(
    message
  );

export interface AssistantChatResult {
  headline: string;
  highlights: string[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    highlights: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
  },
  required: ["headline", "highlights"],
};

export async function runAssistantChat(input: {
  userId: string;
  message: string;
  timezone?: string;
}): Promise<AssistantChatResult> {
  const rangeDays = needsWeekdayContext(input.message)
    ? EXTENDED_RANGE_DAYS
    : DEFAULT_RANGE_DAYS;
  const range = getRange(rangeDays, input.timezone);
  const previousRange = getPreviousRange(range, input.timezone);

  const [currentData, previousData] = await Promise.all([
    getAssistantData(input.userId, range),
    getAssistantData(input.userId, previousRange),
  ]);

  const summary = computeSummary(currentData, previousData, range, previousRange);

  if (isWriteIntent(input.message)) {
    return {
      headline: "Read‑only for now",
      highlights: [
        "I can’t log or edit entries yet.",
        "Use Log Meal, Log Workout, or Metrics to add data.",
      ],
    };
  }

  const targetWeekday =
    getWeekdayFromText(input.message) ??
    (/\btomorrow\b/i.test(input.message) ? getTomorrowWeekday(input.timezone) : null);

  const prompt = buildAssistantPrompt({
    question: input.message,
    summary,
    currentData,
    previousData,
    targetWeekday,
    timezone: input.timezone,
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

  let parsed: { headline: string; highlights: string[] } | null = null;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("Failed to parse assistant response");
  }

  if (!parsed) {
    throw new Error("Assistant response was empty");
  }

  return {
    headline: parsed.headline,
    highlights: parsed.highlights ?? [],
  };
}
