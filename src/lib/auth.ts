/**
 * API keys. MVP: env OKAGENT_API_KEYS="key1:userA,key2:userB". Later: per-user keys in the DB.
 * Keys are compared in constant time.
 */
import { timingSafeEqual } from "node:crypto";

export function parseKeys(env = process.env.OKAGENT_API_KEYS ?? ""): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of env.split(",")) {
    const [key, user] = part.split(":").map((s) => s?.trim());
    if (key && user) m.set(key, user);
  }
  return m;
}

export function userForBearer(authHeader: string | null, keys = parseKeys()): string | null {
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  for (const [k, u] of keys) {
    const a = Buffer.from(k), b = Buffer.from(token);
    if (a.length === b.length && timingSafeEqual(a, b)) return u;
  }
  return null;
}
