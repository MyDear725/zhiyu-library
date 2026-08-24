import { getD1 } from "../../../db";
import { ensureDatabase } from "../../../db/runtime";
import { isLibraryTimeSlot, isLibraryToday } from "../../../lib/library/time";
import { effectiveSeatStatus, type StoredSeatStatus } from "../../../lib/seats/availability";
import { getSessionUser } from "../../../lib/server/auth";

type SeatRow = {
  id: number;
  floor: string;
  label: string;
  zone: string;
  status: StoredSeatStatus;
  mapX: number;
  mapY: number;
  updatedAt: string;
  isReserved: number;
};

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const url = new URL(request.url);
  const floor = url.searchParams.get("floor") ?? "3F";
  const bookingDate = url.searchParams.get("bookingDate") ?? "";
  const timeSlot = url.searchParams.get("timeSlot") ?? "";
  if (!/^[1-4]F$/.test(floor)) return Response.json({ error: "无效楼层" }, { status: 400 });
  if (!isLibraryToday(bookingDate) || !isLibraryTimeSlot(timeSlot)) {
    return Response.json({ error: "请选择今天的有效使用时段" }, { status: 400 });
  }
  const result = await getD1().prepare(`SELECT seats.id, seats.floor, seats.label, seats.zone, seats.status,
    seats.map_x AS mapX, seats.map_y AS mapY, seats.updated_at AS updatedAt,
    EXISTS(SELECT 1 FROM reservations
      WHERE reservations.seat_id = seats.id
        AND reservations.booking_date = ?
        AND reservations.time_slot = ?
        AND reservations.status = 'active') AS isReserved
    FROM seats WHERE seats.floor = ? ORDER BY seats.id`).bind(bookingDate, timeSlot, floor).all<SeatRow>();
  const seats = result.results.map(({ isReserved, ...seat }: SeatRow) => ({
    ...seat,
    status: effectiveSeatStatus(seat.status, Boolean(isReserved)),
  }));
  return Response.json({ seats, bookingDate, timeSlot, generatedAt: new Date().toISOString() });
}
