import { env } from "cloudflare:workers";
import { retrieveKnowledge } from "../../../../lib/knowledge/library-kb";
import { getSessionUser } from "../../../../lib/server/auth";
import { recordActivity } from "../../../../lib/libraryos/activity";
import { inferTopics } from "../../../../lib/libraryos/catalog.js";

type OpenAIResponse = {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

function extractOutputText(payload: OpenAIResponse) {
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text!.trim())
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const payload = await request.json() as { question?: string };
  const question = String(payload.question ?? "").trim().replace(/\s+/g, " ");
  if (question.length < 2 || question.length > 300) {
    return Response.json({ error: "问题需为 2—300 个字符" }, { status: 400 });
  }

  const chunks = retrieveKnowledge(question, 3);
  void recordActivity({ userId: user.id, eventType: "assistant_question", entityType: "knowledge_query", metadata: { topic: inferTopics(question)[0] } });
  const sources = chunks.map(({ id, title }) => ({ id, title }));
  const context = chunks.map((chunk, index) => `[资料 ${index + 1}｜${chunk.title}]\n${chunk.content}`).join("\n\n");
  const runtimeEnv = env as unknown as Record<string, unknown>;
  const apiKey = typeof runtimeEnv.OPENAI_API_KEY === "string" ? runtimeEnv.OPENAI_API_KEY.trim() : "";
  const model = typeof runtimeEnv.OPENAI_MODEL === "string" && runtimeEnv.OPENAI_MODEL.trim()
    ? runtimeEnv.OPENAI_MODEL.trim()
    : "gpt-5.6-luna";

  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 500,
          instructions: "你是知遇图书馆的馆内助手。只能根据提供的馆内知识资料回答。回答要简洁、友好、可执行；资料没有覆盖时要明确说明，并建议咨询服务台。不要编造开放时间、价格、规章或用户信息。",
          input: `用户问题：${question}\n\n馆内知识资料：\n${context}`,
        }),
      });
      if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
      const answer = extractOutputText(await response.json() as OpenAIResponse);
      if (answer) return Response.json({ answer, sources, mode: "llm", model });
    } catch {
      // Keep the assistant available during demos even when the external model is unreachable.
    }
  }

  const primary = chunks[0];
  const answer = primary.score > 0
    ? `${primary.content}\n\n如果还需要更具体的帮助，可以告诉我你正在使用哪个页面或遇到了哪一步。`
    : "我暂时没有在馆内知识库中找到完全对应的说明。你可以换一种说法，或前往服务台咨询工作人员。";
  return Response.json({ answer, sources, mode: "retrieval", model: null });
}
