import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { buildKnowledgeTwin } from "../../../../lib/libraryos/knowledge-twin.js";
import { getSessionUser } from "../../../../lib/server/auth";

type EventRow = { eventType: string; metadataJson: string | null };

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const [borrowed, eventRows] = await Promise.all([
    getD1().prepare("SELECT book_id AS bookId FROM borrow_list WHERE user_id = ? ORDER BY id DESC LIMIT 20").bind(user.id).all<{ bookId: number }>(),
    getD1().prepare("SELECT event_type AS eventType, metadata_json AS metadataJson FROM activity_events WHERE user_id = ? ORDER BY id DESC LIMIT 80").bind(user.id).all<EventRow>(),
  ]);
  const events = eventRows.results.map((row) => {
    try { return { eventType: row.eventType, metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {} }; }
    catch { return { eventType: row.eventType, metadata: {} }; }
  });
  return Response.json({ twin: buildKnowledgeTwin({ borrowedBookIds: borrowed.results.map((row) => row.bookId), events }) });
}
