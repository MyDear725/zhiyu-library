import assert from "node:assert/strict";
import test from "node:test";

import {
  LIBRARY_TIME_SLOTS,
  isLibraryTimeSlot,
  isLibraryToday,
  libraryDate,
  libraryDateLabel,
} from "../lib/library/time.ts";

test("derives the library date in Asia/Shanghai", () => {
  assert.equal(libraryDate(new Date("2026-08-22T16:30:00.000Z")), "2026-08-23");
  assert.equal(libraryDate(new Date("2026-08-22T15:59:59.999Z")), "2026-08-22");
  assert.equal(libraryDate(new Date("2026-08-22T16:00:00.000Z")), "2026-08-23");
});

test("formats the dynamic Chinese today label", () => {
  assert.equal(libraryDateLabel(new Date("2026-08-22T16:30:00.000Z")), "今天 · 8月23日");
});

test("accepts only the Shanghai current date", () => {
  const now = new Date("2026-08-22T16:30:00.000Z");
  assert.equal(isLibraryToday("2026-08-23", now), true);
  assert.equal(isLibraryToday("2026-08-22", now), false);
  assert.equal(isLibraryToday("not-a-date", now), false);
});

test("accepts only the three supported library time slots", () => {
  assert.deepEqual(LIBRARY_TIME_SLOTS, ["08:30—12:00", "14:30—18:00", "18:00—21:30"]);
  for (const slot of LIBRARY_TIME_SLOTS) assert.equal(isLibraryTimeSlot(slot), true);
  assert.equal(isLibraryTimeSlot("12:00—14:00"), false);
  assert.equal(isLibraryTimeSlot(""), false);
});
