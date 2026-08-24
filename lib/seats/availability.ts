export type StoredSeatStatus = "free" | "using" | "away";
export type EffectiveSeatStatus = StoredSeatStatus | "reserved";

export function effectiveSeatStatus(
  storedStatus: StoredSeatStatus,
  hasActiveReservation: boolean,
): EffectiveSeatStatus {
  if (storedStatus !== "free") return storedStatus;
  return hasActiveReservation ? "reserved" : "free";
}

export function summarizeZoneAvailability(
  seats: Array<{ zone: string; status: EffectiveSeatStatus }>,
) {
  const summaries = new Map<string, { zone: string; freeSeats: number; totalSeats: number }>();

  for (const seat of seats) {
    const summary = summaries.get(seat.zone) ?? { zone: seat.zone, freeSeats: 0, totalSeats: 0 };
    summary.totalSeats += 1;
    if (seat.status === "free") summary.freeSeats += 1;
    summaries.set(seat.zone, summary);
  }

  return [...summaries.values()];
}
