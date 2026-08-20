import { getD1 } from "../../../db";
import { ensureDatabase } from "../../../db/runtime";
import { getSessionUser } from "../../../lib/server/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await ensureDatabase();
  const floor = new URL(request.url).searchParams.get("floor") ?? "3F";
  if (!/^[1-4]F$/.test(floor)) return Response.json({ error: "无效楼层" }, { status: 400 });
  const result = await getD1().prepare(`SELECT id, floor, label, zone, status,
    map_x AS mapX, map_y AS mapY, updated_at AS updatedAt
    FROM seats WHERE floor = ? ORDER BY id`).bind(floor).all();
  return Response.json({ seats: result.results });
}
