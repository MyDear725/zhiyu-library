import { getD1 } from "../../../db";
import { ensureDatabase } from "../../../db/runtime";
import { getSessionUser } from "../../../lib/server/auth";

type ReservationRow = {
  id: number;
  bookingDate: string;
  timeSlot: string;
  floor: string;
  seatLabel: string;
  zone: string;
};

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const reservation = await getD1().prepare(`SELECT reservations.id,
    reservations.booking_date AS bookingDate, reservations.time_slot AS timeSlot,
    seats.floor, seats.label AS seatLabel, seats.zone
    FROM reservations JOIN seats ON seats.id = reservations.seat_id
    WHERE reservations.user_id = ? AND reservations.status = 'active'
    ORDER BY reservations.id DESC LIMIT 1`).bind(user.id).first<ReservationRow>();
  return Response.json({ reservation: reservation ?? null });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { seatId?: number; bookingDate?: string; timeSlot?: string };
  const seatId = Number(payload.seatId);
  const bookingDate = payload.bookingDate ?? "";
  const timeSlot = payload.timeSlot ?? "";
  if (!Number.isInteger(seatId) || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || timeSlot.length < 5) {
    return Response.json({ error: "预约信息不完整" }, { status: 400 });
  }

  const seat = await getD1().prepare("SELECT id, floor, label, zone, status FROM seats WHERE id = ?")
    .bind(seatId).first<{ id: number; floor: string; label: string; zone: string; status: string }>();
  if (!seat) return Response.json({ error: "座位不存在" }, { status: 404 });
  if (seat.status !== "free") return Response.json({ error: "该座位当前不可预约，请刷新地图" }, { status: 409 });

  try {
    await getD1().prepare(`UPDATE reservations SET status = 'cancelled'
      WHERE user_id = ? AND booking_date = ? AND time_slot = ? AND status = 'active'`)
      .bind(user.id, bookingDate, timeSlot).run();
    const result = await getD1().prepare(`INSERT INTO reservations
      (user_id, seat_id, booking_date, time_slot, status) VALUES (?, ?, ?, ?, 'active')`)
      .bind(user.id, seatId, bookingDate, timeSlot).run();
    return Response.json({ reservation: {
      id: Number(result.meta.last_row_id), bookingDate, timeSlot,
      floor: seat.floor, seatLabel: seat.label, zone: seat.zone,
    } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "预约失败";
    if (message.includes("UNIQUE")) return Response.json({ error: "该座位刚刚被预约，请选择其他座位" }, { status: 409 });
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  await getD1().prepare("UPDATE reservations SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
    .bind(user.id).run();
  return Response.json({ ok: true });
}
