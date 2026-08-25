import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { getSessionUser } from "../../../../lib/server/auth";

type CountRow = { count: number };
type TopicRow = { metadataJson: string | null };

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const [todayPlans, intents, activeReservations, planCount, topicRows] = await Promise.all([
    d1.prepare("SELECT COUNT(*) AS count FROM study_intents WHERE booking_date = ?").bind(new Date().toISOString().slice(0, 10)).first<CountRow>(),
    d1.prepare("SELECT COUNT(*) AS count FROM study_intents").first<CountRow>(),
    d1.prepare("SELECT COUNT(*) AS count FROM reservations WHERE status = 'active'").first<CountRow>(),
    d1.prepare("SELECT COUNT(*) AS count FROM activity_events WHERE event_type = 'librarian_plan_created'").first<CountRow>(),
    d1.prepare("SELECT metadata_json AS metadataJson FROM activity_events WHERE metadata_json IS NOT NULL ORDER BY id DESC LIMIT 120").all<TopicRow>(),
  ]);
  const topicCounts = new Map<string, number>();
  for (const row of topicRows.results) {
    try {
      const topic = JSON.parse(row.metadataJson ?? "{}").topic;
      if (typeof topic === "string" && topic) topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    } catch { /* Ignore malformed legacy data. */ }
  }
  const topics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count }));
  return Response.json({
    isDemo: true,
    kpis: [
      { label: "今日学习需求", value: Number(todayPlans?.count ?? 0) },
      { label: "累计学习意图", value: Number(intents?.count ?? 0) },
      { label: "当前预约座位", value: Number(activeReservations?.count ?? 0) },
      { label: "AI 馆员计划", value: Number(planCount?.count ?? 0) },
    ],
    topics,
  });
}
