import { getD1 } from "../../db";
import { ensureDatabase } from "../../db/runtime";

const SESSION_COOKIE = "zhiyu_session";
const SESSION_DAYS = 7;
const PASSWORD_ITERATIONS = 120000;

export type SessionUser = {
  id: number;
  studentId: string;
  name: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return {
    hash: bytesToBase64(hash),
    salt: bytesToBase64(salt),
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string, iterations: number) {
  const actual = await derivePassword(password, base64ToBytes(salt), iterations);
  const expected = base64ToBytes(expectedHash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

function randomToken() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function cookieValue(requestUrl: string, token: string, maxAge: number) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const pair of cookies.split(";")) {
    const [key, ...parts] = pair.trim().split("=");
    if (key === name) return parts.join("=");
  }
  return null;
}

export async function createSession(userId: number, requestUrl: string) {
  await ensureDatabase();
  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await getD1()
    .prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .bind(userId, tokenHash, expiresAt)
    .run();
  return cookieValue(requestUrl, token, SESSION_DAYS * 86400);
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  await ensureDatabase();
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await getD1().prepare(`SELECT users.id, users.student_id AS studentId, users.name
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP
    LIMIT 1`).bind(tokenHash).first<SessionUser>();
  return row ?? null;
}

export async function deleteSession(request: Request) {
  await ensureDatabase();
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    await getD1().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return cookieValue(request.url, "", 0);
}

export function clearSessionCookie(requestUrl: string) {
  return cookieValue(requestUrl, "", 0);
}

export function validStudentId(value: string) {
  return /^\d{8,12}$/.test(value);
}
