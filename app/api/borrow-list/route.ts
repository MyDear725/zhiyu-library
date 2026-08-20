import { getD1 } from "../../../db";
import { ensureDatabase } from "../../../db/runtime";
import { getSessionUser } from "../../../lib/server/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const result = await getD1().prepare("SELECT book_id AS bookId FROM borrow_list WHERE user_id = ? ORDER BY id")
    .bind(user.id).all<{ bookId: number }>();
  return Response.json({ bookIds: result.results.map((row) => row.bookId) });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { bookId?: number };
  const bookId = Number(payload.bookId);
  if (!Number.isInteger(bookId) || bookId < 1) return Response.json({ error: "图书编号无效" }, { status: 400 });
  await getD1().prepare("INSERT OR IGNORE INTO borrow_list (user_id, book_id) VALUES (?, ?)")
    .bind(user.id, bookId).run();
  return Response.json({ ok: true }, { status: 201 });
}
