# india-working-days

**Indian bank working days, done right.** Knows that banks close on Sundays and the **2nd and 4th Saturdays**, but stay **open on the 1st, 3rd and 5th Saturdays**. Finds the next working day, T+N settlement dates and EMI due dates, with state-wise holidays.

- Correct RBI Saturday rule (many apps wrongly treat every Saturday as closed)
- Time-zone safe: works on calendar dates, not clock times
- Zero dependencies, TypeScript types, `import` and `require`

## Install

```bash
npm install india-working-days
```

## Quick start

```js
import { isWorkingDay, closedReason, nextWorkingDay, addWorkingDays } from "india-working-days";

isWorkingDay("2026-11-14");      // false
closedReason("2026-11-14");      // "2nd Saturday"
isWorkingDay("2026-11-21");      // true (3rd Saturday, banks are open)

nextWorkingDay("2026-11-13");    // "2026-11-16" (skips 2nd Saturday and Sunday)
addWorkingDays("2026-11-20", 2); // "2026-11-23" (T+2; the 3rd Saturday counts)
```

Dates are `"YYYY-MM-DD"` strings or JavaScript `Date` objects. Results are always `"YYYY-MM-DD"` strings.

## State holidays

Bank holidays differ by state. Create a calendar for a state and pass the holidays you need, for example from [RBI's holiday list](https://www.rbi.org.in/Scripts/HolidayMatrixDisplay.aspx) or your bank's own list:

```js
import { createCalendar } from "india-working-days";

const maharashtra = createCalendar({
  state: "MH",
  holidays: [
    { date: "2026-12-25", name: "Christmas" },                 // all states
    { date: "2026-11-09", name: "Example holiday", states: ["MH", "KA"] },
  ],
});

maharashtra.closedReason("2026-11-09");   // "Example holiday"
maharashtra.nextWorkingDay("2026-11-07"); // "2026-11-10"
```

Republic Day (26 Jan), Independence Day (15 Aug) and Gandhi Jayanti (2 Oct) are built in for every year. Turn them off with `nationalHolidays: false`.

## EMI and payment due dates

```js
import { adjustDate } from "india-working-days";

adjustDate("2026-05-31");                       // "2026-06-01" (following)
adjustDate("2026-05-31", "preceding");          // "2026-05-30"
adjustDate("2026-05-31", "modified-following"); // "2026-05-30" (never jumps into next month)
```

`modified-following` is the standard rule for loan and EMI dates: move forward to the next working day, unless that lands in the next month, then move back.

## All functions

Use them directly (default calendar) or on a calendar from `createCalendar()`.

| Function | Returns |
|---|---|
| `isWorkingDay(date)` | `true` if banks are open |
| `closedReason(date)` | `"Sunday"`, `"2nd Saturday"`, a holiday name, or `null` |
| `nextWorkingDay(date)` / `previousWorkingDay(date)` | first working day after / before |
| `addWorkingDays(date, n)` | date `n` working days later (negative goes back) |
| `adjustDate(date, rule)` | `"following"`, `"preceding"` or `"modified-following"` (on a calendar: `.adjust()`) |
| `workingDaysBetween(start, end)` | count of working days, both dates included |
| `closedDays(start, end)` | list of `{ date, reason }` for closed days |
| `saturdayOfMonth(date)` | `1` to `5` for Saturdays, else `null` |

## Options for `createCalendar`

| Option | Default | Meaning |
|---|---|---|
| `state` | none | State code; holidays with a matching `states` entry apply |
| `holidays` | `[]` | `{ date, name, states? }`; leave out `states` for all-India |
| `saturdays` | `"second-fourth"` | Use `"all"` if a 5-day banking week is adopted, or `"none"` |
| `nationalHolidays` | `true` | Include 26 Jan, 15 Aug and 2 Oct |

## Scope

This library is about **bank branch working days**. Stock exchange trading days, and 24x7 systems like UPI and NEFT, follow different calendars. Always confirm holiday dates against RBI's official list for your use case.

## License

MIT