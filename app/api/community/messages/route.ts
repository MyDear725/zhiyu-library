import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { getSessionUser } from "../../../../lib/server/auth";
import { recordActivity } from "../../../../lib/libraryos/activity";

const rooms = new Set(["study", "course", "hackathon"]);

type MessageRow = {
  id: number;
  userId: number | null;
  name: string;
  studentId: string | null;
  room: string;
  content: string;
  isAnonymous: number;
  createdAt: string;
};

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const room = new URL(request.url).searchParams.get("room") ?? "study";
  if (!rooms.has(room)) return Response.json({ error: "聊天室不存在" }, { status: 404 });
  const rows = await getD1().prepare(`SELECT community_messages.id, community_messages.user_id AS userId,
    COALESCE(users.name, '社区引导员') AS name, users.student_id AS studentId,
    community_messages.room, community_messages.content, community_messages.is_anonymous AS isAnonymous,
    community_messages.created_at AS createdAt
    FROM community_messages LEFT JOIN users ON users.id = community_messages.user_id
    WHERE community_messages.room = ? ORDER BY community_messages.id DESC LIMIT 80`).bind(room).all<MessageRow>();
  const messages = [...rows.results].reverse().map((message) => {
    const isAnonymous = Boolean(message.isAnonymous) && message.userId !== null;
    return {
      ...message,
      userId: isAnonymous ? null : message.userId,
      name: isAnonymous ? "匿名同学" : message.name,
      studentId: isAnonymous ? null : message.studentId,
      isAnonymous,
      isMine: message.userId === user.id,
      isSystem: message.userId === null,
    };
  });
  return Response.json({ messages });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { room?: string; content?: string; anonymous?: boolean };
  const room = String(payload.room ?? "");
  const content = String(payload.content ?? "").trim().replace(/\s+/g, " ");
  const isAnonymous = payload.anonymous === true;
  if (!rooms.has(room)) return Response.json({ error: "聊天室不存在" }, { status: 404 });
  if (content.length < 1 || content.length > 300) return Response.json({ error: "消息需为 1—300 个字符" }, { status: 400 });

  const latest = await getD1().prepare(`SELECT created_at AS createdAt FROM community_messages
    WHERE user_id = ? ORDER BY id DESC LIMIT 1`).bind(user.id).first<{ createdAt: string }>();
  if (latest && Date.now() - new Date(latest.createdAt.replace(" ", "T") + "Z").getTime() < 1200) {
    return Response.json({ error: "发送得太快了，请稍后再试" }, { status: 429 });
  }

  const result = await getD1().prepare("INSERT INTO community_messages (user_id, room, content, is_anonymous) VALUES (?, ?, ?, ?)")
    .bind(user.id, room, content, isAnonymous ? 1 : 0).run();
  void recordActivity({ userId: user.id, eventType: "community_posted", entityType: "community_room", entityId: room, metadata: { room, anonymous: isAnonymous } });
  return Response.json({ message: {
    id: Number(result.meta.last_row_id), userId: isAnonymous ? null : user.id,
    name: isAnonymous ? "匿名同学" : user.name, studentId: isAnonymous ? null : user.studentId,
    room, content, isAnonymous, isMine: true, isSystem: false, createdAt: new Date().toISOString(),
  } }, { status: 201 });
}
