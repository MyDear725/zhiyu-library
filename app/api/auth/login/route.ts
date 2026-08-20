import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/runtime";
import { createSession, verifyPassword } from "../../../../lib/server/auth";

type UserRow = {
  id: number;
  studentId: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const payload = await request.json() as { studentId?: string; password?: string };
    const studentId = payload.studentId?.trim() ?? "";
    const password = payload.password ?? "";
    const user = await getD1().prepare(`SELECT id, student_id AS studentId, name,
      password_hash AS passwordHash, password_salt AS passwordSalt,
      password_iterations AS passwordIterations FROM users WHERE student_id = ? LIMIT 1`)
      .bind(studentId).first<UserRow>();

    if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt, user.passwordIterations))) {
      return Response.json({ error: "学号或密码不正确" }, { status: 401 });
    }

    const sessionCookie = await createSession(user.id, request.url);
    return Response.json(
      { user: { id: user.id, studentId: user.studentId, name: user.name } },
      { headers: { "Set-Cookie": sessionCookie } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
