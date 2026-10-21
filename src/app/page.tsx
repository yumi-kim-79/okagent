export default function Home() {
  return (
    <main className="mx-auto max-w-[640px] px-5 py-16">
      <h1 className="text-[2rem] font-extrabold leading-tight tracking-[-0.02em]">에이전트가 묻고, 사람이 답합니다.</h1>
      <p className="mt-4 text-[1.05rem] leading-relaxed text-muted max-w-[52ch]">
        OK Agent는 AI 에이전트가 결제·발송·삭제처럼 되돌릴 수 없는 일을 하기 전에 사람에게 묻는 승인 창구입니다. 에이전트는 요청을 만들고 기다리고, 사람은 링크 하나로 승인하거나 거부합니다.
      </p>
      <h2 className="mt-12 text-lg font-bold">에이전트에서 연결하기</h2>
      <pre className="mt-3 overflow-auto rounded-md border border-rule bg-white p-4 text-[0.85rem] leading-relaxed">{`# K-MCP 서버 (네이버·카페24)는 환경변수 두 개로 켭니다
APPROVAL_URL=https://ok.appmonster.co.kr
APPROVAL_API_KEY=…

# 직접 호출
POST /api/v1/requests   Authorization: Bearer <key>
{ "title": "스마트스토어 재고 변경", "action": "naver_update_stock", "payload": {...}, "amount": 0 }
→ { "id": "req_…", "status": "pending", "approveUrl": "https://…/r/req_…?t=…" }

GET  /api/v1/requests/req_…   → { "status": "approved" | "rejected" | "expired" | "pending" }`}</pre>
      <p className="mt-8 text-sm text-muted">앱몬스터 · <a className="underline" href="https://github.com/groove79/kmcp/tree/master/packages/approval">@appmonster/approval 클라이언트</a></p>
    </main>
  );
}
