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
  const money = r.amount != null ? ` · ${r.amount.toLocaleString("ko-KR")} ${r.currency ?? ""}`.trimEnd() : "";
  const text = `🤖 승인 요청: ${r.title}${money}\n${r.description ?? ""}\n승인/거부 → ${approveUrl(r)}`;
  await Promise.all([notifyWebhook(r, text, fetchImpl), notifyKakaoSelf(r, text, fetchImpl)]);
}

async function notifyWebhook(r: ApprovalRecord, text: string, fetchImpl: typeof fetch) {
  const hook = process.env.OKAGENT_NOTIFY_WEBHOOK?.trim();
  if (!hook) return;
  try {
    await fetchImpl(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, request: { id: r.id, title: r.title, action: r.action, amount: r.amount, source: r.source, approveUrl: approveUrl(r) } }), signal: AbortSignal.timeout(5000) });
  } catch (e) {
    console.error("[notify] webhook failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * KakaoTalk "나에게 보내기" (single-owner deployments): the owner links a Kakao Developers app once
 * (`npx @appmonster/mcp-kakao auth`) and puts the refresh token here. No app install, lands in 나와의 채팅.
 * Env: OKAGENT_KAKAO_REST_API_KEY, OKAGENT_KAKAO_REFRESH_TOKEN, optional OKAGENT_KAKAO_CLIENT_SECRET.
 */
const kakaoCache = globalThis as unknown as { __okagentKakao?: { token: string; exp: number } };
async function kakaoAccessToken(fetchImpl: typeof fetch): Promise<string | null> {
  const key = process.env.OKAGENT_KAKAO_REST_API_KEY?.trim();
  const refresh = process.env.OKAGENT_KAKAO_REFRESH_TOKEN?.trim();
  if (!key || !refresh) return null;
  const c = kakaoCache.__okagentKakao;
  if (c && c.exp > Date.now() + 60_000) return c.token;
  const body = new URLSearchParams({ grant_type: "refresh_token", client_id: key, refresh_token: refresh });
  const secret = process.env.OKAGENT_KAKAO_CLIENT_SECRET?.trim();
  if (secret) body.set("client_secret", secret);
  const res = await fetchImpl("https://kauth.kakao.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`kakao token HTTP ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  kakaoCache.__okagentKakao = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function notifyKakaoSelf(r: ApprovalRecord, text: string, fetchImpl: typeof fetch) {
  try {
    const token = await kakaoAccessToken(fetchImpl);
    if (!token) return;
    const url = approveUrl(r);
    const template_object = JSON.stringify({ object_type: "text", text: text.slice(0, 200), link: { web_url: url, mobile_web_url: url }, button_title: "승인/거부" });
    const res = await fetchImpl("https://kapi.kakao.com/v2/api/talk/memo/default/send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams({ template_object }), signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`kakao send HTTP ${res.status}: ${await res.text()}`);
  } catch (e) {
    console.error("[notify] kakao failed:", e instanceof Error ? e.message : e);
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
