import type { AssistantDataSnapshot, AssistantRange } from "@/lib/assistant/data";
import type { AssistantSummary } from "@/lib/assistant/metrics";

const formatDateRange = (range: AssistantRange) => `${range.start} to ${range.end}`;

export const ASSISTANT_SYSTEM_PROMPT = `You are VoiceFit Coach, a concise and supportive health-tracking assistant.

Rules:
- Read-only: never claim you logged or updated data.
- Use only the provided data.
- If data is missing, say so plainly.
- No medical or clinical advice.
- Keep responses short (2-5 sentences) and actionable.
- Use a light coach tone: encouraging but not hype.
`;

export function buildAssistantPrompt(input: {
  question: string;
  summary: AssistantSummary;
  currentData: AssistantDataSnapshot;
  previousData: AssistantDataSnapshot;
}): string {
  const { question, summary, currentData, previousData } = input;

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
      });
      const time = session.startedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${date} ${time} · ${session.title} · ${session.setCount} sets`;
    })
    .join("\n");

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
`;
}
