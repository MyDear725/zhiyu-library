const forbiddenKeys = new Set(["password", "passwordhash", "passwordsalt", "token", "session", "studentid", "question", "content", "message", "rawtext"]);

export function sanitizeActivityMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return Object.fromEntries(Object.entries(metadata).filter(([key, value]) => {
    const normalized = key.replace(/[_-]/g, "").toLowerCase();
    return !forbiddenKeys.has(normalized) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null);
  }));
}
