# OK Agent 배포 (Vercel + Neon)

실검증 몰아서 할 때 순서대로. 전부 무료 플랜으로 됩니다.

## 1. DB — Neon (2분)

1. https://neon.tech → 가입 → **New Project** (리전 `AWS ap-southeast-1 Singapore`가 한국에서 가장 가까움)
2. 대시보드의 **Connection string** (`postgresql://…?sslmode=require`) 복사
3. 테이블은 첫 요청 때 자동 생성됩니다 (`CREATE TABLE IF NOT EXISTS`) — 마이그레이션 없음

## 2. API 키 만들기 (터미널)

```bash
cd /Volumes/Dev/okagent && node -e "console.log('ok_'+require('crypto').randomBytes(24).toString('base64url'))"
```

출력된 키를 `ok_xxx:yusung` 형태로 3번에서 씁니다. (키는 에이전트 쪽 설정에만 넣고 채팅에 붙여넣지 않기)

## 3. Vercel 배포 (5분)

```bash
cd /Volumes/Dev/okagent && npx vercel link
```

(처음이면 Vercel 로그인 → 새 프로젝트 `okagent` 로 연결)

환경변수 — Production 에 추가 (각 명령이 값을 물어보면 붙여넣기):

```bash
cd /Volumes/Dev/okagent && npx vercel env add DATABASE_URL production
cd /Volumes/Dev/okagent && npx vercel env add OKAGENT_API_KEYS production      # ok_xxx:yusung
cd /Volumes/Dev/okagent && npx vercel env add OKAGENT_BASE_URL production      # https://okagent.vercel.app (도메인 붙이면 교체)
```

배포:

```bash
cd /Volumes/Dev/okagent && npx vercel --prod
```

## 4. 확인

```bash
curl -s -X POST https://okagent.vercel.app/api/v1/requests \
  -H 'Authorization: Bearer ok_xxx' -H 'Content-Type: application/json' \
  -d '{"title":"배포 확인","action":"demo","amount":15000,"source":"curl"}'
```

응답의 `approveUrl`을 휴대폰 브라우저에서 열고 **승인** → `GET /api/v1/requests/{id}` 가 `approved` 면 끝.

## 5. 도메인 (선택, 나중에)

후보: `okagent.app` / `agentok.dev` / `approvy.app` — 가용 확인 후 결정.
Vercel 프로젝트 → Settings → Domains 에 추가, DNS 에 CNAME `cname.vercel-dns.com`.
붙인 뒤 `OKAGENT_BASE_URL` 을 새 도메인으로 바꾸고 재배포.

## 6. MCP 서버에 연결

kmcp 의 naver-commerce / cafe24 는 환경변수만 넣으면 쓰기 도구마다 승인을 받습니다:

```json
{
  "mcpServers": {
    "naver-commerce": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-naver-commerce"],
      "env": {
        "NAVER_COMMERCE_CLIENT_ID": "…",
        "NAVER_COMMERCE_CLIENT_SECRET": "…",
        "APPROVAL_URL": "https://okagent.vercel.app",
        "APPROVAL_API_KEY": "ok_xxx",
        "APPROVAL_TIMEOUT_SEC": "300"
      }
    }
  }
}
```

## 알림 (선택)

Slack 채널로 새 요청을 받으려면: Slack → Incoming Webhooks → URL 을 `OKAGENT_NOTIFY_WEBHOOK` 에 추가.
카카오 알림톡·앱 푸시는 로드맵.
