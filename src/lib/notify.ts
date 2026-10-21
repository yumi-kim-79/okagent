/**
 * Notify the approver that a request is waiting. MVP channels (all optional, by env):
 *  - OKAGENT_NOTIFY_WEBHOOK: generic JSON POST (Slack incoming webhook works with {text})
 *  - later: Kakao 알림톡, Expo push
 */
import type { ApprovalRecord } from "./store.js";

export function approveUrl(r: ApprovalRecord, base = process.env.OKAGENT_BASE_URL ?? "http://localhost:3000") {
  return `${base.replace(/\/+$/, "")}/r/${r.id}?t=${r.token}`;
}

export async function notifyPending(r: ApprovalRecord, fetchImpl: typeof fetch = fetch) {
  const hook = process.env.OKAGENT_NOTIFY_WEBHOOK?.trim();
  if (!hook) return;
  const money = r.amount != null ? ` · ${r.amount.toLocaleString("ko-KR")} ${r.currency ?? ""}`.trimEnd() : "";
  const text = `🤖 승인 요청: ${r.title}${money}\n${r.description ?? ""}\n승인/거부 → ${approveUrl(r)}`;
  try {
    await fetchImpl(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, request: { id: r.id, title: r.title, action: r.action, amount: r.amount, source: r.source, approveUrl: approveUrl(r) } }), signal: AbortSignal.timeout(5000) });
  } catch (e) {
    console.error("[notify] webhook failed:", e instanceof Error ? e.message : e);
  }
}

export async function notifyDecided(r: ApprovalRecord, fetchImpl: typeof fetch = fetch) {
  if (!r.callbackUrl) return;
  try {
    await fetchImpl(r.callbackUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status: r.status, note: r.note, decidedAt: r.decidedAt, action: r.action }), signal: AbortSignal.timeout(5000) });
  } catch (e) {
    console.error("[notify] callback failed:", e instanceof Error ? e.message : e);
  }
}
