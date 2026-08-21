import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { getSessionUser } from "../../../../lib/server/auth";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const reservation = await getD1().prepare(`SELECT reservations.id, seats.floor, seats.label
    FROM reservations JOIN seats ON seats.id = reservations.seat_id
    WHERE reservations.user_id = ? AND reservations.status = 'active'
    ORDER BY reservations.id DESC LIMIT 1`).bind(user.id).first<{ id: number; floor: string; label: string }>();
  if (!reservation) return Response.json({ error: "当前没有可签退的座位" }, { status: 404 });
  await getD1().prepare("UPDATE reservations SET status = 'completed' WHERE id = ? AND user_id = ?")
    .bind(reservation.id, user.id).run();
  return Response.json({ ok: true, floor: reservation.floor, seatLabel: reservation.label });
}
