import { DateInput, dayOfWeek, fromDayNumber, saturdayOfMonth, toDayNumber } from "./dates.js";

/** Which Saturdays banks are closed on. */
export type SaturdayRule = "second-fourth" | "all" | "none";

export interface HolidayInput {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  /** State codes this holiday applies to, e.g. ["MH", "KA"]. Leave out for an all-India holiday. */
  states?: string[];
}

export interface Holiday {
  date: string;
  name: string;
  /** null means it applies in every state. */
  states: string[] | null;
}

export interface CalendarOptions {
  /** Only holidays for this state (plus all-India ones) count. Leave out to use only all-India holidays. */
  state?: string;
  /** Extra holidays, e.g. from RBI's yearly list or your own bank's list. */
  holidays?: HolidayInput[];
  /** Default "second-fourth" (current RBI rule). Use "all" if a 5-day banking week is adopted. */
  saturdays?: SaturdayRule;
  /** Include Republic Day, Independence Day and Gandhi Jayanti every year. Default true. */
  nationalHolidays?: boolean;
}

/** Bank-holiday dates that are the same every year across India. */
const NATIONAL_HOLIDAYS: { monthDay: string; name: string }[] = [
  { monthDay: "01-26", name: "Republic Day" },
  { monthDay: "08-15", name: "Independence Day" },
  { monthDay: "10-02", name: "Gandhi Jayanti" },
];

/** "following": move forward. "preceding": move back. "modified-following": move forward unless that changes the month, then move back. */
export type AdjustRule = "following" | "preceding" | "modified-following";

const MAX_SEARCH_DAYS = 3660; // ~10 years; protects against a calendar with no working days

export class BankCalendar {
  private readonly state: string | null;
  private readonly saturdays: SaturdayRule;
  private readonly nationalHolidays: boolean;
  private readonly holidaysByDay = new Map<number, Holiday[]>();

  constructor(options: CalendarOptions = {}) {
    this.state = options.state ? options.state.trim().toUpperCase() : null;
    this.saturdays = options.saturdays ?? "second-fourth";
    if (!["second-fourth", "all", "none"].includes(this.saturdays)) {
      throw new RangeError(`saturdays must be "second-fourth", "all" or "none"`);
    }
    this.nationalHolidays = options.nationalHolidays ?? true;

    for (const h of options.holidays ?? []) {
      if (!h || typeof h.name !== "string" || !h.name.trim()) {
        throw new TypeError(`Every holiday needs a name (date: ${h?.date})`);
      }
      const day = toDayNumber(h.date);
      const holiday: Holiday = {
        date: fromDayNumber(day),
        name: h.name,
        states: h.states ? h.states.map((s) => s.trim().toUpperCase()) : null,
      };
      const list = this.holidaysByDay.get(day) ?? [];
      list.push(holiday);
      this.holidaysByDay.set(day, list);
    }
  }

  /** Returns the holiday on this date for this calendar's state, or null. */
  getHoliday(date: DateInput): Holiday | null {
    const day = toDayNumber(date);
    const custom = (this.holidaysByDay.get(day) ?? []).find(
      (h) => h.states === null || (this.state !== null && h.states.includes(this.state)),
    );
    if (custom) return custom;
    if (this.nationalHolidays) {
      const iso = fromDayNumber(day);
      const national = NATIONAL_HOLIDAYS.find((n) => iso.endsWith(n.monthDay));
      if (national) return { date: iso, name: national.name, states: null };
    }
    return null;
  }

  /**
   * Why banks are closed on this date: "Sunday", "2nd Saturday",
   * a holiday name, or null if it is a working day.
   */
  closedReason(date: DateInput): string | null {
    const day = toDayNumber(date);
    const holiday = this.getHoliday(fromDayNumber(day));
    if (holiday) return holiday.name;
    const weekday = dayOfWeek(day);
    if (weekday === 0) return "Sunday";
    if (weekday === 6) {
      const nth = saturdayOfMonth(fromDayNumber(day)) as number;
      const label = `${nth}${["st", "nd", "rd", "th", "th"][nth - 1]} Saturday`;
      if (this.saturdays === "all") return label;
      if (this.saturdays === "second-fourth" && (nth === 2 || nth === 4)) return label;
    }
    return null;
  }

  /** true if banks are open on this date. */
  isWorkingDay(date: DateInput): boolean {
    return this.closedReason(date) === null;
  }

  /** The first working day strictly after this date. */
  nextWorkingDay(date: DateInput): string {
    return this.step(toDayNumber(date), 1);
  }

  /** The last working day strictly before this date. */
  previousWorkingDay(date: DateInput): string {
    return this.step(toDayNumber(date), -1);
  }

  /**
   * Moves forward (or back, if negative) by a number of working days.
   * addWorkingDays("2026-11-20", 2) is the T+2 settlement date.
   * With 0, returns the date itself if it is a working day, otherwise the next one.
   */
  addWorkingDays(date: DateInput, count: number): string {
    if (!Number.isInteger(count)) throw new TypeError("count must be a whole number");
    let day = toDayNumber(date);
    if (count === 0) return this.adjust(fromDayNumber(day), "following");
    const direction = count > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(count); i++) {
      day = toDayNumber(this.step(day, direction));
    }
    return fromDayNumber(day);
  }

  /**
   * If the date is not a working day, moves it using a standard banking rule.
   * Use "modified-following" for loan EMI and payment due dates.
   */
  adjust(date: DateInput, rule: AdjustRule = "following"): string {
    if (!["following", "preceding", "modified-following"].includes(rule)) {
      throw new RangeError(`rule must be "following", "preceding" or "modified-following"`);
    }
    const day = toDayNumber(date);
    const iso = fromDayNumber(day);
    if (this.isWorkingDay(iso)) return iso;
    if (rule === "preceding") return this.step(day, -1);
    const next = this.step(day, 1);
    // Modified following: never jump into the next month (standard for EMI due dates).
    if (rule === "modified-following" && next.slice(0, 7) !== iso.slice(0, 7)) {
      return this.step(day, -1);
    }
    return next;
  }

  /** Counts working days from start to end, both included. Negative if end is before start. */
  workingDaysBetween(start: DateInput, end: DateInput): number {
    let a = toDayNumber(start);
    let b = toDayNumber(end);
    const sign = a <= b ? 1 : -1;
    if (sign < 0) [a, b] = [b, a];
    let count = 0;
    for (let day = a; day <= b; day++) {
      if (this.isWorkingDay(fromDayNumber(day))) count++;
    }
    return sign * count;
  }

  /** All days banks are closed between two dates (both included), with the reason. */
  closedDays(start: DateInput, end: DateInput): { date: string; reason: string }[] {
    const a = toDayNumber(start);
    const b = toDayNumber(end);
    if (b < a) throw new RangeError("end must not be before start");
    const result: { date: string; reason: string }[] = [];
    for (let day = a; day <= b; day++) {
      const iso = fromDayNumber(day);
      const reason = this.closedReason(iso);
      if (reason) result.push({ date: iso, reason });
    }
    return result;
  }

  private step(day: number, direction: 1 | -1): string {
    for (let i = 0; i < MAX_SEARCH_DAYS; i++) {
      day += direction;
      const iso = fromDayNumber(day);
      if (this.isWorkingDay(iso)) return iso;
    }
    throw new Error("No working day found within 10 years. Check your holiday list.");
  }
}

/** Creates a calendar for a state, with your own holidays and Saturday rule. */
export function createCalendar(options: CalendarOptions = {}): BankCalendar {
  return new BankCalendar(options);
}