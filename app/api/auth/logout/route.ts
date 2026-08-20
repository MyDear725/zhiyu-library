import { deleteSession } from "../../../../lib/server/auth";

export async function POST(request: Request) {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": await deleteSession(request) } });
}
