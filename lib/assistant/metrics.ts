import type { AssistantDataSnapshot, AssistantRange } from "@/lib/assistant/data";

export interface AssistantSummaryTotals {
  calories: number;
  steps: number | null;
  workouts: number;
  weightAvgKg: number | null;
  weightChangeKg: number | null;
}

export interface AssistantSummary {
  period: AssistantRange;
  previousPeriod: AssistantRange;
  totals: AssistantSummaryTotals;
  deltas: {
    calories: number | null;
    steps: number | null;
    workouts: number | null;
    weightAvgKg: number | null;
    weightChangeKg: number | null;
  };
}

const average = (values: number[]): number | null => {
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
};

const safeDelta = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) return null;
  return current - previous;
};

export function computeTotals(snapshot: AssistantDataSnapshot): AssistantSummaryTotals {
  const calories = snapshot.meals.reduce((acc, meal) => acc + meal.calories, 0);

  const stepsValues = snapshot.metrics
    .map((metric) => metric.steps)
    .filter((value): value is number => typeof value === "number");
  const steps = stepsValues.length
    ? stepsValues.reduce((acc, value) => acc + value, 0)
    : null;

  const workouts = snapshot.workouts.length;

  const weightValues = snapshot.metrics
    .map((metric) => metric.weightKg)
    .filter((value): value is number => typeof value === "number");
  const weightAvgKg = average(weightValues);

  let weightChangeKg: number | null = null;
  if (weightValues.length >= 2) {
    const first = weightValues[0];
    const last = weightValues[weightValues.length - 1];
    weightChangeKg = last - first;
  }

  return {
    calories,
    steps,
    workouts,
    weightAvgKg,
    weightChangeKg,
  };
}

export function computeSummary(
  current: AssistantDataSnapshot,
  previous: AssistantDataSnapshot,
  currentRange: AssistantRange,
  previousRange: AssistantRange
): AssistantSummary {
  const currentTotals = computeTotals(current);
  const previousTotals = computeTotals(previous);

  return {
    period: currentRange,
    previousPeriod: previousRange,
    totals: currentTotals,
    deltas: {
      calories: safeDelta(currentTotals.calories, previousTotals.calories),
      steps: safeDelta(currentTotals.steps, previousTotals.steps),
      workouts: safeDelta(currentTotals.workouts, previousTotals.workouts),
      weightAvgKg: safeDelta(currentTotals.weightAvgKg, previousTotals.weightAvgKg),
      weightChangeKg: safeDelta(
        currentTotals.weightChangeKg,
        previousTotals.weightChangeKg
      ),
    },
  };
}
