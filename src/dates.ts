/**
 * Date helpers that work on plain calendar dates ("2026-11-14"), never on
 * clock times. This avoids time-zone bugs: in India (UTC+5:30),
 * new Date("2026-11-14") is really 05:30 AM, and in other zones it can
 * even land on the previous day.
 */

/** A date as accepted by this library: "YYYY-MM-DD" or a JavaScript Date. */
export type DateInput = string | Date;

const MS_PER_DAY = 86_400_000;

/** Converts a date to a whole day number (days since 1970-01-01). */
export function toDayNumber(input: DateInput): number {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new TypeError("Invalid Date");
    // Use the calendar date the user sees on their own clock.
    return Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()) / MS_PER_DAY;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input).trim());
  if (!match) throw new TypeError(`Expected a date like "2026-11-14", got "${input}"`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const day = Date.UTC(y, m - 1, d) / MS_PER_DAY;
  // Reject dates like 2026-02-30, which JavaScript would silently roll over.
  if (fromDayNumber(day) !== `${match[1]}-${match[2]}-${match[3]}`) {
    throw new RangeError(`"${input}" is not a real calendar date`);
  }
  return day;
}

/** Converts a day number back to "YYYY-MM-DD". */
export function fromDayNumber(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** 0 = Sunday, 1 = Monday ... 6 = Saturday. */
export function dayOfWeek(day: number): number {
  return (((day + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday (4)
}

/** Day of the month, 1-31. */
export function dayOfMonth(day: number): number {
  return Number(fromDayNumber(day).slice(8, 10));
}

/** Which Saturday of the month this is (1st to 5th), or null if not a Saturday. */
export function saturdayOfMonth(input: DateInput): number | null {
  const day = toDayNumber(input);
  if (dayOfWeek(day) !== 6) return null;
  return Math.ceil(dayOfMonth(day) / 7);
}