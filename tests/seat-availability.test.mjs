import assert from "node:assert/strict";
import test from "node:test";

import { effectiveSeatStatus, summarizeZoneAvailability } from "../lib/seats/availability.ts";

test("keeps a free seat free when the selected slot has no active reservation", () => {
  assert.equal(effectiveSeatStatus("free", false), "free");
});

test("marks a free seat reserved for an active reservation in the selected slot", () => {
  assert.equal(effectiveSeatStatus("free", true), "reserved");
});

test("preserves using and away states ahead of reservation metadata", () => {
  assert.equal(effectiveSeatStatus("using", true), "using");
  assert.equal(effectiveSeatStatus("away", true), "away");
});

test("does not reserve a seat for a different date, slot, or inactive reservation", () => {
  const current = { bookingDate: "2026-08-23", timeSlot: "14:30—18:00" };
  const reservations = [
    { bookingDate: "2026-08-24", timeSlot: current.timeSlot, status: "active" },
    { bookingDate: current.bookingDate, timeSlot: "18:00—21:30", status: "active" },
    { bookingDate: current.bookingDate, timeSlot: current.timeSlot, status: "cancelled" },
  ];
  const hasActiveReservation = reservations.some((reservation) => (
    reservation.bookingDate === current.bookingDate
      && reservation.timeSlot === current.timeSlot
      && reservation.status === "active"
  ));
  assert.equal(effectiveSeatStatus("free", hasActiveReservation), "free");
});

test("summarizes only effective free seats as available", () => {
  assert.deepEqual(summarizeZoneAvailability([
    { zone: "A", status: "free" },
    { zone: "A", status: "reserved" },
    { zone: "A", status: "using" },
    { zone: "B", status: "free" },
    { zone: "B", status: "away" },
  ]), [
    { zone: "A", freeSeats: 1, totalSeats: 3 },
    { zone: "B", freeSeats: 1, totalSeats: 2 },
  ]);
});
