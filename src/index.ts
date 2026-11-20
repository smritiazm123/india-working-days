import { AdjustRule, BankCalendar } from "./calendar.js";
import { DateInput } from "./dates.js";

export * from "./calendar.js";
export { saturdayOfMonth } from "./dates.js";
export type { DateInput } from "./dates.js";

// Ready-to-use functions with the default calendar: Sundays, 2nd/4th
// Saturdays and the three national holidays. For state holidays, use createCalendar().
const defaultCalendar = new BankCalendar();

export const isWorkingDay = (date: DateInput) => defaultCalendar.isWorkingDay(date);
export const closedReason = (date: DateInput) => defaultCalendar.closedReason(date);
export const nextWorkingDay = (date: DateInput) => defaultCalendar.nextWorkingDay(date);
export const previousWorkingDay = (date: DateInput) => defaultCalendar.previousWorkingDay(date);
export const addWorkingDays = (date: DateInput, count: number) => defaultCalendar.addWorkingDays(date, count);
export const adjustDate = (date: DateInput, rule?: AdjustRule) => defaultCalendar.adjust(date, rule);
export const workingDaysBetween = (start: DateInput, end: DateInput) => defaultCalendar.workingDaysBetween(start, end);
export const closedDays = (start: DateInput, end: DateInput) => defaultCalendar.closedDays(start, end);