import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  isWorkingDay, closedReason, nextWorkingDay, previousWorkingDay,
  addWorkingDays, adjustDate, workingDaysBetween, closedDays,
  saturdayOfMonth, createCalendar,
} from "../dist/index.js";

test("Which Saturday of the month", () => {
  assert.equal(saturdayOfMonth("2026-11-07"), 1);
  assert.equal(saturdayOfMonth("2026-11-14"), 2);
  assert.equal(saturdayOfMonth("2026-11-21"), 3);
  assert.equal(saturdayOfMonth("2026-11-28"), 4);
  assert.equal(saturdayOfMonth("2026-05-30"), 5);
  assert.equal(saturdayOfMonth("2026-11-20"), null); // a Friday
});

test("Sundays and 2nd/4th Saturdays are closed; other Saturdays are open", () => {
  assert.equal(closedReason("2026-11-22"), "Sunday");
  assert.equal(closedReason("2026-11-14"), "2nd Saturday");
  assert.equal(closedReason("2026-11-28"), "4th Saturday");
  assert.equal(isWorkingDay("2026-11-07"), true); // 1st Saturday
  assert.equal(isWorkingDay("2026-11-21"), true); // 3rd Saturday
  assert.equal(isWorkingDay("2026-05-30"), true); // 5th Saturday
  assert.equal(isWorkingDay("2026-11-20"), true); // Friday
});

test("National holidays apply every year", () => {
  assert.equal(closedReason("2026-01-26"), "Republic Day");
  assert.equal(closedReason("2027-08-15"), "Independence Day");
  assert.equal(closedReason("2030-10-02"), "Gandhi Jayanti");
  assert.equal(createCalendar({ nationalHolidays: false }).isWorkingDay("2026-01-26"), true);
});

test("Next and previous working day", () => {
  assert.equal(nextWorkingDay("2026-11-13"), "2026-11-16"); // Fri -> skips 2nd Sat + Sun
  assert.equal(nextWorkingDay("2026-11-20"), "2026-11-21"); // Fri -> 3rd Sat is open
  assert.equal(previousWorkingDay("2026-11-16"), "2026-11-13");
});

test("addWorkingDays (T+N settlement)", () => {
  assert.equal(addWorkingDays("2026-11-20", 2), "2026-11-23");
  assert.equal(addWorkingDays("2026-11-13", 1), "2026-11-16");
  assert.equal(addWorkingDays("2026-11-16", -1), "2026-11-13");
  assert.equal(addWorkingDays("2026-11-14", 0), "2026-11-16"); // closed day -> next
  assert.equal(addWorkingDays("2026-11-16", 0), "2026-11-16");
  assert.throws(() => addWorkingDays("2026-11-16", 1.5), TypeError);
});

test("adjustDate for EMI due dates", () => {
  assert.equal(adjustDate("2026-11-16"), "2026-11-16"); // already a working day
  assert.equal(adjustDate("2026-05-31"), "2026-06-01"); // following
  assert.equal(adjustDate("2026-05-31", "preceding"), "2026-05-30");
  assert.equal(adjustDate("2026-05-31", "modified-following"), "2026-05-30"); // stays in May
  assert.equal(adjustDate("2026-11-22", "modified-following"), "2026-11-23");
  assert.throws(() => adjustDate("2026-11-22", "sideways"), RangeError);
});

test("Counting working days and listing closed days", () => {
  assert.equal(workingDaysBetween("2026-11-01", "2026-11-30"), 23);
  assert.equal(workingDaysBetween("2026-11-30", "2026-11-01"), -23);
  assert.equal(workingDaysBetween("2026-11-16", "2026-11-16"), 1);
  const nov = closedDays("2026-11-01", "2026-11-30");
  assert.equal(nov.length, 7);
  assert.deepEqual(nov[2], { date: "2026-11-14", reason: "2nd Saturday" });
});

test("State calendars with custom holidays", () => {
  const holidays = [
    { date: "2026-12-25", name: "Christmas" },
    { date: "2026-11-09", name: "Example state holiday", states: ["MH", "KA"] },
  ];
  const mh = createCalendar({ state: "mh", holidays });
  const dl = createCalendar({ state: "DL", holidays });
  assert.equal(mh.closedReason("2026-11-09"), "Example state holiday");
  assert.equal(dl.isWorkingDay("2026-11-09"), true);
  assert.equal(dl.closedReason("2026-12-25"), "Christmas");
  assert.equal(mh.nextWorkingDay("2026-11-07"), "2026-11-10");
  assert.equal(mh.getHoliday("2026-11-09").name, "Example state holiday");
  assert.equal(mh.getHoliday("2026-11-10"), null);
});

test("Saturday rule is configurable (5-day banking week)", () => {
  const fiveDay = createCalendar({ saturdays: "all" });
  assert.equal(fiveDay.closedReason("2026-11-21"), "3rd Saturday");
  assert.equal(fiveDay.nextWorkingDay("2026-11-20"), "2026-11-23");
  assert.equal(createCalendar({ saturdays: "none" }).isWorkingDay("2026-11-14"), true);
  assert.throws(() => createCalendar({ saturdays: "odd" }), RangeError);
});

test("Input validation and Date objects", () => {
  assert.throws(() => isWorkingDay("2026-02-30"), RangeError);
  assert.throws(() => isWorkingDay("14/11/2026"), TypeError);
  assert.throws(() => isWorkingDay(new Date("nope")), TypeError);
  assert.throws(() => createCalendar({ holidays: [{ date: "2026-12-25" }] }), TypeError);
  assert.equal(closedReason(new Date(2026, 10, 14)), "2nd Saturday"); // months start at 0
  assert.equal(nextWorkingDay(new Date(2026, 10, 13)), "2026-11-16");
});

test("CommonJS build works with require()", () => {
  const require = createRequire(import.meta.url);
  const cjs = require("../dist/index.cjs");
  assert.equal(cjs.addWorkingDays("2026-11-20", 2), "2026-11-23");
});