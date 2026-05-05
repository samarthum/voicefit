const PENDING_STATUSES = new Set(["interpreting", "failed"]);

type SortableMeal = {
  interpretationStatus: string;
  eatenAt: Date | string;
};

export function compareMealsPendingFirst<T extends SortableMeal>(a: T, b: T): number {
  const aPending = PENDING_STATUSES.has(a.interpretationStatus);
  const bPending = PENDING_STATUSES.has(b.interpretationStatus);
  if (aPending !== bPending) return aPending ? -1 : 1;
  const aTime = typeof a.eatenAt === "string" ? Date.parse(a.eatenAt) : a.eatenAt.getTime();
  const bTime = typeof b.eatenAt === "string" ? Date.parse(b.eatenAt) : b.eatenAt.getTime();
  return bTime - aTime;
}
