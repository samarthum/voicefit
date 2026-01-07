/**
 * Get browser timezone - client-side only
 */
export function getBrowserTimezone(): string {
  if (typeof window === "undefined") {
    return "UTC";
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(timezone?: string): string {
  const now = new Date();
  if (timezone) {
    return now.toLocaleDateString("en-CA", { timeZone: timezone });
  }
  return now.toISOString().split("T")[0];
}

/**
 * Format a date to YYYY-MM-DD string
 */
export function toDateString(date: Date, timezone?: string): string {
  if (timezone) {
    return date.toLocaleDateString("en-CA", { timeZone: timezone });
  }
  return date.toISOString().split("T")[0];
}

/**
 * Format time in 24-hour format (HH:mm)
 */
export function formatTime(date: Date, timezone?: string): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date, timezone?: string): string {
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

/**
 * Get start of day for a date string
 */
export function getStartOfDay(dateString: string, timezone?: string): Date {
  const date = new Date(dateString + "T00:00:00");
  return date;
}

/**
 * Get end of day for a date string
 */
export function getEndOfDay(dateString: string, timezone?: string): Date {
  const date = new Date(dateString + "T23:59:59.999");
  return date;
}

/**
 * Get dates for last N days
 */
export function getLastNDays(n: number, timezone?: string): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(toDateString(date, timezone));
  }

  return dates.reverse();
}
