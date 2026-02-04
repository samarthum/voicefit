import type { AssistantDataSnapshot, AssistantRange } from "@/lib/assistant/data";
import type { AssistantSummary } from "@/lib/assistant/metrics";

const formatDateRange = (range: AssistantRange) => `${range.start} to ${range.end}`;

export const ASSISTANT_SYSTEM_PROMPT = `You are VoiceFit Coach, a concise and supportive health-tracking assistant.

Rules:
- Read-only: never claim you logged or updated data.
- Use only the provided data.
- If data is missing, say so plainly.
- No medical or clinical advice.
- Format: short headline + 1–3 short highlights.
- Highlights should be one sentence each (no long paragraphs, no tables).
- Avoid raw numbers unless the user explicitly asks for specifics.
- If a future workout is requested and multiple patterns exist for that weekday, ask a single clarification question before recommending.
- Use a light coach tone: encouraging but not hype.
`;

export function buildAssistantPrompt(input: {
  question: string;
  summary: AssistantSummary;
  currentData: AssistantDataSnapshot;
  previousData: AssistantDataSnapshot;
  targetWeekday?: string | null;
  timezone?: string;
}): string {
  const { question, summary, currentData, previousData, targetWeekday, timezone } = input;

  const meals = currentData.meals
    .slice(0, 20)
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
    .join("\n");

  const metrics = currentData.metrics
    .map((metric) => {
      const steps = metric.steps ?? "n/a";
      const weight = metric.weightKg ?? "n/a";
      return `${metric.date} · steps ${steps} · weight ${weight}`;
    })
    .join("\n");

  const workouts = currentData.workouts
    .slice(0, 15)
    .map((session) => {
      const date = session.startedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: timezone,
      });
      const time = session.startedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      });
      const exerciseNames = Array.from(
        new Set(session.sets.map((set) => set.exerciseName).filter(Boolean))
      ).slice(0, 5);
      const exercisesText = exerciseNames.length ? ` · ${exerciseNames.join(", ")}` : "";
      return `${date} ${time} · ${session.title} · ${session.setCount} sets${exercisesText}`;
    })
    .join("\n");

  const targetWeekdayText = targetWeekday ? `Target weekday: ${targetWeekday}\n` : "";

  const patternSummary = targetWeekday
    ? buildWeekdayPatternSummary(currentData.workouts, targetWeekday, timezone)
    : "No target weekday provided.";

  const previousSummary = previousData.meals.length || previousData.metrics.length || previousData.workouts.length
    ? `Previous period (${formatDateRange(summary.previousPeriod)}) totals: calories ${summary.deltas.calories !== null ? summary.totals.calories - summary.deltas.calories : "n/a"}, steps ${summary.deltas.steps !== null && summary.totals.steps !== null ? summary.totals.steps - summary.deltas.steps : "n/a"}, workouts ${summary.deltas.workouts !== null ? summary.totals.workouts - summary.deltas.workouts : "n/a"}.`
    : `Previous period (${formatDateRange(summary.previousPeriod)}) has no data.`;

  return `User question: ${question}

Current period: ${formatDateRange(summary.period)}
Totals: calories ${summary.totals.calories}, steps ${summary.totals.steps ?? "n/a"}, workouts ${summary.totals.workouts}, avg weight ${summary.totals.weightAvgKg ?? "n/a"}, weight change ${summary.totals.weightChangeKg ?? "n/a"}.
Deltas vs previous period: calories ${summary.deltas.calories ?? "n/a"}, steps ${summary.deltas.steps ?? "n/a"}, workouts ${summary.deltas.workouts ?? "n/a"}, avg weight ${summary.deltas.weightAvgKg ?? "n/a"}, weight change ${summary.deltas.weightChangeKg ?? "n/a"}.
${previousSummary}

Meals (most recent first):
${meals || "No meals logged."}

Daily metrics (oldest first):
${metrics || "No daily metrics logged."}

Workouts (most recent first):
${workouts || "No workouts logged."}

${targetWeekdayText}
Workout patterns for target weekday (last 4 weeks):
${patternSummary}
`;
}

function buildWeekdayPatternSummary(
  workouts: AssistantDataSnapshot["workouts"],
  targetWeekday: string,
  timezone?: string
) {
  const normalize = (value: string) => value.trim().toLowerCase();
  const target = normalize(targetWeekday);
  const sessions = workouts.filter((session) => {
    const weekday = session.startedAt.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: timezone,
    });
    return normalize(weekday) === target;
  });

  if (!sessions.length) {
    return "No workouts logged for that weekday.";
  }

  const patternCounts = new Map<string, { count: number; label: string }>();

  sessions.forEach((session) => {
    const exerciseNames = Array.from(
      new Set(session.sets.map((set) => set.exerciseName).filter(Boolean))
    ).sort();
    const signature = exerciseNames.length ? exerciseNames.join(" / ") : session.title;
    const key = normalize(signature);
    const existing = patternCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      patternCounts.set(key, { count: 1, label: signature || session.title });
    }
  });

  return Array.from(patternCounts.values())
    .map((pattern) => `- ${pattern.label} (${pattern.count} session${pattern.count === 1 ? "" : "s"})`)
    .join("\n");
}
