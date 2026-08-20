import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { createSession, hashPassword, validStudentId } from "../../../../lib/server/auth";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const payload = await request.json() as { studentId?: string; name?: string; password?: string };
    const studentId = payload.studentId?.trim() ?? "";
    const name = payload.name?.trim() ?? "";
    const password = payload.password ?? "";

    if (!validStudentId(studentId)) return Response.json({ error: "学号应为 8—12 位数字" }, { status: 400 });
    if (name.length < 2 || name.length > 20) return Response.json({ error: "请输入真实姓名" }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "密码至少需要 8 位" }, { status: 400 });

    const exists = await getD1().prepare("SELECT id FROM users WHERE student_id = ?").bind(studentId).first();
    if (exists) return Response.json({ error: "该学号已经注册" }, { status: 409 });

    const passwordData = await hashPassword(password);
    const result = await getD1().prepare(`INSERT INTO users
      (student_id, name, password_hash, password_salt, password_iterations)
      VALUES (?, ?, ?, ?, ?)`).bind(studentId, name, passwordData.hash, passwordData.salt, passwordData.iterations).run();
    const userId = Number(result.meta.last_row_id);
    const sessionCookie = await createSession(userId, request.url);

    return Response.json(
      { user: { id: userId, studentId, name } },
      { status: 201, headers: { "Set-Cookie": sessionCookie } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
