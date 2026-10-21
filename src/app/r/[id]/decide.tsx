"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Decide({ id, token }: { id: string; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function send(decision: "approved" | "rejected") {
    if (busy) return;
    setBusy(decision); setError(null);
    try {
      const res = await fetch(`/api/v1/requests/${encodeURIComponent(id)}/decide`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, decision, note: note || undefined }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.status ? `이미 ${j.status === "approved" ? "승인" : j.status === "rejected" ? "거부" : "만료"}된 요청입니다.` : "전송에 실패했습니다. 다시 눌러주세요.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setBusy(null);
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-sm text-muted" htmlFor="note">메모 (선택)</label>
      <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="예: 수량 확인함" className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => send("rejected")} disabled={!!busy} className="rounded-lg border-2 border-reject px-4 py-4 text-[1.1rem] font-bold text-reject disabled:opacity-50">{busy === "rejected" ? "거부 중…" : "거부"}</button>
        <button onClick={() => send("approved")} disabled={!!busy} className="rounded-lg bg-approve px-4 py-4 text-[1.1rem] font-bold text-white disabled:opacity-50">{busy === "approved" ? "승인 중…" : "승인"}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-reject">{error}</p>}
    </div>
  );
}
