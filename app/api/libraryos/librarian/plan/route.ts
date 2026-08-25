import { getD1 } from "../../../../../db";
import { env } from "cloudflare:workers";
import { ensureDatabase } from "../../../../../db/runtime";
import { recordActivity } from "../../../../../lib/libraryos/activity";
import { buildLocalPlan, normalizeGoal } from "../../../../../lib/libraryos/planner.js";
import { buildPeerSignal } from "../../../../../lib/libraryos/people-engine.js";
import { recommendSpace } from "../../../../../lib/libraryos/space-engine.js";
import { getSessionUser } from "../../../../../lib/server/auth";

type IntentRow = { purpose: "focus" | "discuss" | "read" | "other"; topic: "tech" | "design" | "competition" | "course" | "other" | null };

type OpenAIResponse = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

async function enhanceSummary(goal: string, fallback: string) {
  const runtimeEnv = env as unknown as Record<string, unknown>;
  const apiKey = typeof runtimeEnv.OPENAI_API_KEY === "string" ? runtimeEnv.OPENAI_API_KEY.trim() : "";
  if (!apiKey) return { summary: fallback, mode: "local" as const };
  try {
    const model = typeof runtimeEnv.OPENAI_MODEL === "string" && runtimeEnv.OPENAI_MODEL.trim() ? runtimeEnv.OPENAI_MODEL.trim() : "gpt-5.6-luna";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, store: false, max_output_tokens: 100, instructions: "你是图书馆行动计划的文字助手。只用一句中文重述学习目标的优先顺序；不要提及或编造书籍、座位、楼层、库存、人数或规则。", input: goal }),
    });
    if (!response.ok) throw new Error("OpenAI response unavailable");
    const payload = await response.json() as OpenAIResponse;
    const summary = (payload.output ?? []).flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text" && typeof item.text === "string").map((item) => item.text!.trim()).join(" ");
    return summary && summary.length <= 180 ? { summary, mode: "llm" as const } : { summary: fallback, mode: "local" as const };
  } catch {
    return { summary: fallback, mode: "local" as const };
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  try {
    const payload = await request.json() as { goal?: string; timeSlot?: string; bookingDate?: string };
    const goal = normalizeGoal(payload.goal);
    const timeSlot = String(payload.timeSlot ?? "今晚").slice(0, 40);
    const bookingDate = /^\d{4}-\d{2}-\d{2}$/.test(String(payload.bookingDate ?? "")) ? String(payload.bookingDate) : new Date().toISOString().slice(0, 10);
    const intent = await getD1().prepare(`SELECT purpose, topic FROM study_intents
      WHERE user_id = ? AND booking_date = ? ORDER BY updated_at DESC LIMIT 1`).bind(user.id, bookingDate).first<IntentRow>();
    const seats = await getD1().prepare("SELECT COUNT(*) AS count FROM seats WHERE status = 'free'").first<{ count: number }>();
    const peer = await getD1().prepare(`SELECT COUNT(*) AS count FROM study_intents
      WHERE booking_date = ? AND time_slot = ?`).bind(bookingDate, timeSlot).first<{ count: number }>();
    const space = recommendSpace({ purpose: intent?.purpose ?? "discuss", topic: intent?.topic ?? "competition", availableSeats: Number(seats?.count ?? 0) });
    const plan = buildLocalPlan({ goal, peerCount: Number(peer?.count ?? 0), space });
    const enhanced = await enhanceSummary(goal, plan.summary);
    plan.summary = enhanced.summary;
    plan.mode = enhanced.mode;
    plan.peerSignal = { ...plan.peerSignal, ...buildPeerSignal({ normalizedTopic: plan.peerSignal.topic, peerCount: plan.peerSignal.count, purpose: intent?.purpose ?? "discuss" }) };
    void recordActivity({ userId: user.id, eventType: "librarian_plan_created", entityType: "learning_goal", metadata: { topic: plan.peerSignal.topic, timeSlot } });
    return Response.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "暂时无法生成计划";
    return Response.json({ error: message }, { status: 400 });
  }
}
