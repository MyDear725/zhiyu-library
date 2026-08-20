import { getD1 } from "../../../db";
import { ensureDatabase } from "../../../db/runtime";
import { getSessionUser } from "../../../lib/server/auth";

type StudyPurpose = "focus" | "discuss" | "read" | "other";
type StudyTopic = "tech" | "design" | "competition" | "course" | "other";

type IntentRow = {
  purpose: StudyPurpose;
  topic: StudyTopic | null;
  recommendedFloor: string;
  recommendedZone: string;
};

const purposeValues = new Set<StudyPurpose>(["focus", "discuss", "read", "other"]);
const topicValues = new Set<StudyTopic>(["tech", "design", "competition", "course", "other"]);

const recommendations: Record<string, { floor: string; zone: string; zoneName: string; reason: string }> = {
  focus: { floor: "3F", zone: "C", zoneName: "静音区", reason: "交谈频率低、环境稳定，适合长时间专注。" },
  read: { floor: "1F", zone: "A", zoneName: "临窗阅读区", reason: "靠近综合阅览区，自然采光更适合阅读与查找资料。" },
  other: { floor: "2F", zone: "B", zoneName: "中央灵活区", reason: "空间使用更灵活，方便根据临时安排调整学习方式。" },
  "discuss:tech": { floor: "4F", zone: "A", zoneName: "技术协作区", reason: "邻近电源与白板，当前技术讨论需求较集中。" },
  "discuss:design": { floor: "2F", zone: "B", zoneName: "设计共创区", reason: "桌面空间充足，适合展示草图、原型和共同评审。" },
  "discuss:competition": { floor: "4F", zone: "B", zoneName: "项目研讨区", reason: "适合多人快速交流，当前竞赛项目讨论较集中。" },
  "discuss:course": { floor: "1F", zone: "B", zoneName: "课程讨论区", reason: "靠近综合资料区，方便边讨论边查阅课程资料。" },
  "discuss:other": { floor: "4F", zone: "B", zoneName: "开放研讨区", reason: "对讨论主题限制较少，适合临时组队与问题交流。" },
};

function recommendationFor(purpose: StudyPurpose, topic: StudyTopic | null) {
  return recommendations[purpose === "discuss" ? `discuss:${topic ?? "other"}` : purpose];
}

async function peerCount(bookingDate: string, timeSlot: string, purpose: StudyPurpose, topic: StudyTopic | null) {
  const row = topic
    ? await getD1().prepare(`SELECT COUNT(*) AS count FROM study_intents
        WHERE booking_date = ? AND time_slot = ? AND purpose = ? AND topic = ?`)
      .bind(bookingDate, timeSlot, purpose, topic).first<{ count: number }>()
    : await getD1().prepare(`SELECT COUNT(*) AS count FROM study_intents
        WHERE booking_date = ? AND time_slot = ? AND purpose = ? AND topic IS NULL`)
      .bind(bookingDate, timeSlot, purpose).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

function responseIntent(row: IntentRow, count: number) {
  const recommendation = recommendationFor(row.purpose, row.topic);
  return {
    purpose: row.purpose,
    topic: row.topic,
    recommendation: {
      floor: row.recommendedFloor,
      zone: row.recommendedZone,
      zoneName: recommendation.zoneName,
      reason: recommendation.reason,
      peerCount: count,
    },
  };
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const url = new URL(request.url);
  const bookingDate = url.searchParams.get("bookingDate") ?? "";
  const timeSlot = url.searchParams.get("timeSlot") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || timeSlot.length < 5) {
    return Response.json({ error: "学习时段无效" }, { status: 400 });
  }
  const row = await getD1().prepare(`SELECT purpose, topic,
    recommended_floor AS recommendedFloor, recommended_zone AS recommendedZone
    FROM study_intents WHERE user_id = ? AND booking_date = ? AND time_slot = ? LIMIT 1`)
    .bind(user.id, bookingDate, timeSlot).first<IntentRow>();
  if (!row) return Response.json({ intent: null });
  return Response.json({ intent: responseIntent(row, await peerCount(bookingDate, timeSlot, row.purpose, row.topic)) });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as {
    bookingDate?: string;
    timeSlot?: string;
    purpose?: StudyPurpose;
    topic?: StudyTopic | null;
  };
  const bookingDate = payload.bookingDate ?? "";
  const timeSlot = payload.timeSlot ?? "";
  const purpose = payload.purpose;
  const topic = payload.topic ?? null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || timeSlot.length < 5 || !purpose || !purposeValues.has(purpose)) {
    return Response.json({ error: "请选择今天的学习方式" }, { status: 400 });
  }
  if (purpose === "discuss" && (!topic || !topicValues.has(topic))) {
    return Response.json({ error: "请选择要讨论的问题方向" }, { status: 400 });
  }
  const storedTopic = purpose === "discuss" ? topic : null;
  const recommendation = recommendationFor(purpose, storedTopic);
  await getD1().prepare(`INSERT INTO study_intents
    (user_id, booking_date, time_slot, purpose, topic, recommended_floor, recommended_zone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, booking_date, time_slot) DO UPDATE SET
      purpose = excluded.purpose,
      topic = excluded.topic,
      recommended_floor = excluded.recommended_floor,
      recommended_zone = excluded.recommended_zone,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(user.id, bookingDate, timeSlot, purpose, storedTopic, recommendation.floor, recommendation.zone)
    .run();
  const row: IntentRow = {
    purpose,
    topic: storedTopic,
    recommendedFloor: recommendation.floor,
    recommendedZone: recommendation.zone,
  };
  return Response.json({ intent: responseIntent(row, await peerCount(bookingDate, timeSlot, purpose, storedTopic)) });
}
