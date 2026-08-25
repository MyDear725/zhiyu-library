import { recordActivity } from "../../../../lib/libraryos/activity";
import { findBooks, inferTopics } from "../../../../lib/libraryos/catalog.js";
import { getSessionUser } from "../../../../lib/server/auth";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const payload = await request.json() as { eventType?: string; query?: string };
  if (payload.eventType !== "book_search") return Response.json({ error: "不支持的行为类型" }, { status: 400 });
  const query = String(payload.query ?? "").trim().replace(/\s+/g, " ");
  if (!query || query.length > 120) return Response.json({ error: "搜索内容无效" }, { status: 400 });
  const book = findBooks(query)[0];
  void recordActivity({ userId: user.id, eventType: "book_search", entityType: "book", entityId: book?.id, metadata: { bookId: book?.id, topic: inferTopics(query)[0] } });
  return Response.json({ ok: true });
}
