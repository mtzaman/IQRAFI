import type { Schedule } from "@/lib/db/schema";

/** Days allotted to complete one Khatma for each schedule preset. */
export const SCHEDULE_DAYS: Record<Exclude<Schedule, "custom">, number> = {
  daily: 1,
  every_2_days: 2,
  every_3_days: 3,
  weekly: 7,
};

export function cycleDaysFor(schedule: Schedule, customDays?: number | null): number {
  if (schedule === "custom") {
    const days = Number(customDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new RangeError("Custom schedules need between 1 and 365 days");
    return days;
  }
  return SCHEDULE_DAYS[schedule];
}

/** Calendar date (YYYY-MM-DD) for an instant as observed in an IANA timezone. */
export function dateInTimezone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Adds whole days to a YYYY-MM-DD date string (calendar arithmetic, timezone-independent). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The due date is the last day of the cycle: a daily Khatma starting today is due today. */
export function dueDateFor(startDate: string, cycleDays: number): string {
  return addDays(startDate, cycleDays - 1);
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
