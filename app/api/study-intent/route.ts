import { getD1 } from "../../../db";
import { ensureDatabase } from "../../../db/runtime";
import { isLibraryTimeSlot, isLibraryToday, type LibraryTimeSlot } from "../../../lib/library/time";
import { getSessionUser } from "../../../lib/server/auth";
import {
  recommendStudyZones,
  type StudyPurpose,
  type StudyTopic,
  type ZoneAvailability,
} from "../../../lib/study-match/engine";
import { recordActivity } from "../../../lib/libraryos/activity";

type IntentRow = {
  purpose: StudyPurpose;
  topic: StudyTopic | null;
};

type ZoneAvailabilityRow = {
  floor: string;
  zone: string;
  freeSeats: number;
  totalSeats: number;
};

type PeerCountRow = {
  floor: string;
  zone: string;
  count: number;
};

const purposeValues = new Set<StudyPurpose>(["focus", "discuss", "read", "other"]);
const topicValues = new Set<StudyTopic>(["tech", "design", "competition", "course", "other"]);

async function loadZoneAvailability(bookingDate: string, timeSlot: LibraryTimeSlot) {
  const result = await getD1().prepare(`SELECT seats.floor, seats.zone,
    COUNT(*) AS totalSeats,
    SUM(CASE WHEN seats.status = 'free' AND NOT EXISTS(
      SELECT 1 FROM reservations
      WHERE reservations.seat_id = seats.id
        AND reservations.booking_date = ?
        AND reservations.time_slot = ?
        AND reservations.status = 'active'
    ) THEN 1 ELSE 0 END) AS freeSeats
    FROM seats
    GROUP BY seats.floor, seats.zone
    ORDER BY seats.floor, seats.zone`).bind(bookingDate, timeSlot).all<ZoneAvailabilityRow>();

  return result.results.map((row: ZoneAvailabilityRow): ZoneAvailability => ({
    floor: row.floor,
    zone: row.zone,
    freeSeats: Number(row.freeSeats),
    totalSeats: Number(row.totalSeats),
  }));
}

async function loadLivePeerCounts(bookingDate: string, timeSlot: LibraryTimeSlot, excludedUserId: number) {
  const result = await getD1().prepare(`SELECT recommended_floor AS floor,
    recommended_zone AS zone, COUNT(*) AS count
    FROM study_intents
    WHERE booking_date = ? AND time_slot = ? AND user_id <> ?
    GROUP BY recommended_floor, recommended_zone`)
    .bind(bookingDate, timeSlot, excludedUserId).all<PeerCountRow>();

  return Object.fromEntries(result.results.map((row: PeerCountRow) => [
    `${row.floor}:${row.zone}`,
    Number(row.count),
  ]));
}

async function responseIntent(input: {
  userId: number;
  bookingDate: string;
  timeSlot: LibraryTimeSlot;
  purpose: StudyPurpose;
  topic: StudyTopic | null;
}) {
  const [availability, livePeerCounts] = await Promise.all([
    loadZoneAvailability(input.bookingDate, input.timeSlot),
    loadLivePeerCounts(input.bookingDate, input.timeSlot, input.userId),
  ]);
  const candidates = recommendStudyZones({
    purpose: input.purpose,
    topic: input.topic,
    timeSlot: input.timeSlot,
    availability,
    livePeerCounts,
  });
  if (!candidates.length) return null;

  return {
    purpose: input.purpose,
    topic: input.topic,
    recommendation: candidates[0],
    alternatives: candidates.slice(1, 3),
    generatedAt: new Date().toISOString(),
  };
}

function noAvailableZoneResponse() {
  return Response.json({
    code: "NO_AVAILABLE_ZONE",
    error: "当前时段暂无可推荐区域，请切换时段后重试",
  }, { status: 409 });
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const url = new URL(request.url);
  const bookingDate = url.searchParams.get("bookingDate") ?? "";
  const timeSlot = url.searchParams.get("timeSlot") ?? "";
  if (!isLibraryToday(bookingDate) || !isLibraryTimeSlot(timeSlot)) {
    return Response.json({ error: "请选择今天的有效学习时段" }, { status: 400 });
  }
  const row = await getD1().prepare(`SELECT purpose, topic
    FROM study_intents WHERE user_id = ? AND booking_date = ? AND time_slot = ? LIMIT 1`)
    .bind(user.id, bookingDate, timeSlot).first<IntentRow>();
  if (!row) return Response.json({ intent: null });
  const intent = await responseIntent({ userId: user.id, bookingDate, timeSlot, ...row });
  if (!intent) return noAvailableZoneResponse();
  return Response.json({ intent });
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
  if (!isLibraryToday(bookingDate) || !isLibraryTimeSlot(timeSlot) || !purpose || !purposeValues.has(purpose)) {
    return Response.json({ error: "请选择今天的有效学习方式和时段" }, { status: 400 });
  }
  if (purpose === "discuss" && (!topic || !topicValues.has(topic))) {
    return Response.json({ error: "请选择要讨论的问题方向" }, { status: 400 });
  }
  const storedTopic = purpose === "discuss" ? topic : null;
  const intent = await responseIntent({ userId: user.id, bookingDate, timeSlot, purpose, topic: storedTopic });
  if (!intent) return noAvailableZoneResponse();

  await getD1().prepare(`INSERT INTO study_intents
    (user_id, booking_date, time_slot, purpose, topic, recommended_floor, recommended_zone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, booking_date, time_slot) DO UPDATE SET
      purpose = excluded.purpose,
      topic = excluded.topic,
      recommended_floor = excluded.recommended_floor,
      recommended_zone = excluded.recommended_zone,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(
      user.id,
      bookingDate,
      timeSlot,
      purpose,
      storedTopic,
      intent.recommendation.floor,
      intent.recommendation.zone,
    )
    .run();
void recordActivity({ userId: user.id, eventType: "study_intent_saved", entityType: "study_intent", metadata: { purpose, topic: storedTopic, timeSlot } });
return Response.json({ intent });
}
