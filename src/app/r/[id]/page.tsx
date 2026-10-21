import { getStore } from "@/lib/store";
import { Decide } from "./decide";

export const dynamic = "force-dynamic";

function fmtMoney(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  return currency && currency !== "KRW" ? `${amount.toLocaleString("ko-KR")} ${currency}` : `${amount.toLocaleString("ko-KR")}원`;
}

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const r = await getStore().get(id);
  const ok = r && t && r.token === t;

  if (!ok) {
    return (
      <main className="mx-auto max-w-[520px] px-5 py-16">
        <h1 className="text-xl font-bold">요청을 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted">링크가 잘못됐거나 이미 만료된 요청입니다. 에이전트에게 다시 요청하게 해주세요.</p>
      </main>
    );
  }

  const money = fmtMoney(r.amount, r.currency);
  const remaining = Math.max(0, Math.round((Date.parse(r.expiresAt) - Date.now()) / 60000));

  return (
    <main className="mx-auto max-w-[520px] px-5 py-10">
      <p className="text-sm text-muted">{r.source ? `${r.source} 에이전트의 요청` : "에이전트 요청"} · {new Date(r.createdAt).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</p>
      <h1 className="mt-2 text-[1.6rem] font-extrabold leading-tight tracking-[-0.02em]">{r.title}</h1>
      {money && <p className="mt-3 text-[2rem] font-extrabold tracking-[-0.03em]">{money}</p>}
      {r.description && <p className="mt-3 leading-relaxed text-muted">{r.description}</p>}

      <div className="gyeoljae mt-8 bg-white">
        <div><div className="label">요청</div><p className="text-sm font-semibold break-all">{r.action}</p></div>
        <div>
          <div className="label">승인</div>
          {r.status === "approved" && <div className="seal seal-in">승인</div>}
          {r.status === "rejected" && <p className="font-bold text-reject">거부</p>}
          {r.status === "expired" && <p className="font-bold text-muted">만료</p>}
        </div>
      </div>

      {r.payload != null && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted">정확히 무엇을 실행하나 (인자 보기)</summary>
          <pre className="mt-2 overflow-auto rounded-md border border-rule bg-white p-3 text-[0.8rem] leading-relaxed">{JSON.stringify(r.payload, null, 2)}</pre>
        </details>
      )}

      {r.status === "pending" ? (
        <>
          <p className="mt-6 text-sm text-muted">{remaining}분 안에 답하지 않으면 자동으로 거부됩니다.</p>
          <Decide id={r.id} token={t!} />
        </>
      ) : (
        <p className="mt-8 text-muted">
          {r.status === "approved" && "승인됐습니다. 에이전트가 작업을 진행합니다."}
          {r.status === "rejected" && "거부됐습니다. 에이전트는 이 작업을 실행하지 않습니다."}
          {r.status === "expired" && "시간이 지나 만료됐습니다. 에이전트는 이 작업을 실행하지 않습니다."}
          {r.note && <span className="block mt-1 text-sm">메모: {r.note}</span>}
        </p>
      )}
    </main>
  );
}
