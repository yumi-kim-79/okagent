/**
 * Request store. Two implementations:
 *  - MemoryStore: dev / tests (and single-instance deployments)
 *  - PgStore: production (DATABASE_URL, e.g. Neon/Supabase). Table is created on first use.
 */
import { randomBytes } from "node:crypto";

export type Status = "pending" | "approved" | "rejected" | "expired";

export interface ApprovalRecord {
  id: string;
  /** owner (API key's user) */
  userId: string;
  /** one-time secret in the approve link; whoever holds the link can decide */
  token: string;
  title: string;
  description: string | null;
  action: string;
  payload: unknown;
  amount: number | null;
  currency: string | null;
  source: string | null;
  status: Status;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  callbackUrl: string | null;
}

export interface Store {
  create(r: Omit<ApprovalRecord, "id" | "token" | "createdAt">): Promise<ApprovalRecord>;
  get(id: string): Promise<ApprovalRecord | null>;
  decide(id: string, status: "approved" | "rejected", note: string | null): Promise<ApprovalRecord | null>;
  listPending(userId: string): Promise<ApprovalRecord[]>;
}

export const newId = (p = "req") => `${p}_${randomBytes(9).toString("base64url")}`;
export const newToken = () => randomBytes(24).toString("base64url");

/** Apply expiry lazily on read so no cron is needed. */
export function withExpiry(r: ApprovalRecord): ApprovalRecord {
  if (r.status === "pending" && Date.parse(r.expiresAt) < Date.now()) return { ...r, status: "expired" };
  return r;
}

export class MemoryStore implements Store {
  private m = new Map<string, ApprovalRecord>();
  async create(r: Omit<ApprovalRecord, "id" | "token" | "createdAt">) {
    const rec: ApprovalRecord = { ...r, id: newId(), token: newToken(), createdAt: new Date().toISOString() };
    this.m.set(rec.id, rec);
    return rec;
  }
  async get(id: string) { const r = this.m.get(id); return r ? withExpiry(r) : null; }
  async decide(id: string, status: "approved" | "rejected", note: string | null) {
    const r = this.m.get(id);
    if (!r) return null;
    const cur = withExpiry(r);
    if (cur.status !== "pending") return cur;
    const next = { ...r, status, note, decidedAt: new Date().toISOString() };
    this.m.set(id, next);
    return next;
  }
  async listPending(userId: string) { return [...this.m.values()].map(withExpiry).filter((r) => r.userId === userId && r.status === "pending"); }
}

export class PgStore implements Store {
  private sql: import("postgres").Sql;
  private ready: Promise<void>;
  constructor(url: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres") as typeof import("postgres");
    this.sql = postgres(url, { ssl: "require", max: 3 });
    this.ready = this.sql`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, title TEXT NOT NULL, description TEXT, action TEXT NOT NULL,
        payload JSONB, amount NUMERIC, currency TEXT, source TEXT, status TEXT NOT NULL, note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, decided_at TIMESTAMPTZ, callback_url TEXT
      )`.then(() => this.sql`CREATE INDEX IF NOT EXISTS approval_requests_user_status ON approval_requests (user_id, status)`).then(() => undefined);
  }
  private row(r: Record<string, unknown>): ApprovalRecord {
    return withExpiry({
      id: r.id as string, userId: r.user_id as string, token: r.token as string, title: r.title as string, description: (r.description as string) ?? null,
      action: r.action as string, payload: r.payload, amount: r.amount === null ? null : Number(r.amount), currency: (r.currency as string) ?? null, source: (r.source as string) ?? null,
      status: r.status as Status, note: (r.note as string) ?? null, createdAt: new Date(r.created_at as string).toISOString(), expiresAt: new Date(r.expires_at as string).toISOString(),
      decidedAt: r.decided_at ? new Date(r.decided_at as string).toISOString() : null, callbackUrl: (r.callback_url as string) ?? null,
    });
  }
  async create(r: Omit<ApprovalRecord, "id" | "token" | "createdAt">) {
    await this.ready;
    const id = newId(), token = newToken();
    const rows = await this.sql`INSERT INTO approval_requests (id, user_id, token, title, description, action, payload, amount, currency, source, status, note, expires_at, decided_at, callback_url)
      VALUES (${id}, ${r.userId}, ${token}, ${r.title}, ${r.description}, ${r.action}, ${this.sql.json(r.payload as never)}, ${r.amount}, ${r.currency}, ${r.source}, ${r.status}, ${r.note}, ${r.expiresAt}, ${r.decidedAt}, ${r.callbackUrl}) RETURNING *`;
    return this.row(rows[0]);
  }
  async get(id: string) { await this.ready; const rows = await this.sql`SELECT * FROM approval_requests WHERE id = ${id}`; return rows[0] ? this.row(rows[0]) : null; }
  async decide(id: string, status: "approved" | "rejected", note: string | null) {
    await this.ready;
    const rows = await this.sql`UPDATE approval_requests SET status = ${status}, note = ${note}, decided_at = now() WHERE id = ${id} AND status = 'pending' AND expires_at > now() RETURNING *`;
    return rows[0] ? this.row(rows[0]) : this.get(id);
  }
  async listPending(userId: string) { await this.ready; const rows = await this.sql`SELECT * FROM approval_requests WHERE user_id = ${userId} AND status = 'pending' AND expires_at > now() ORDER BY created_at DESC LIMIT 100`; return rows.map((r) => this.row(r)); }
}

// Next.js bundles API routes and pages separately, so a module-level singleton would be duplicated. Pin it on globalThis.
const g = globalThis as unknown as { __okagentStore?: Store };
export function getStore(): Store {
  if (g.__okagentStore) return g.__okagentStore;
  const url = process.env.DATABASE_URL?.trim();
  g.__okagentStore = url ? new PgStore(url) : new MemoryStore();
  return g.__okagentStore;
}
