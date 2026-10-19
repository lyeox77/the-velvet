import type { AnalyticsPeriod } from './types.ts';

export function localDateKey(value: Date | string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid analytics date');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDay(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new RangeError('Expected YYYY-MM-DD');
  const day = new Date(`${key}T12:00:00`);
  if (localDateKey(day) !== key) throw new RangeError('Invalid calendar day');
  return day;
}

export function addDays(key: string, days: number): string {
  const date = parseDay(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** Calendar arithmetic avoids treating a DST day as exactly 24 hours. */
export function daysBetween(start: string, end: string): number {
  const a = parseDay(start), b = parseDay(end);
  return (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
    - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000;
}

/** Completed Monday-to-Monday weeks only; never compare a partial week. */
export function completedWeeks(now: Date = new Date(), count = 8): AnalyticsPeriod[] {
  if (!Number.isInteger(count) || count < 1 || count > 52) throw new RangeError('Weeks must be 1–52');
  const today = localDateKey(now);
  const end = addDays(today, -((parseDay(today).getDay() + 6) % 7));
  return Array.from({ length: count }, (_, i) => ({
    start: addDays(end, (i - count) * 7), end: addDays(end, (i - count + 1) * 7),
  }));
}

export function containsDay(period: AnalyticsPeriod, day: string): boolean {
  return day >= period.start && day < period.end;
}

export function activityDay(value: Date | string): string | null {
  try { return localDateKey(value); } catch { return null; }
}
