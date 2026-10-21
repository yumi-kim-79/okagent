# OK Agent — 에이전트 승인 게이트

AI 에이전트가 **돈이 나가거나 되돌릴 수 없는 작업**(재고 변경, 주문 처리, 송금, 글 게시 …)을 하기 전에
사람에게 한 번 묻고, 사람은 휴대폰에서 **승인 / 거부** 버튼 하나로 답하는 서비스입니다.

- 에이전트 쪽: HTTP API 한 번(`POST /api/v1/requests`) → 응답의 `approveUrl`을 사람에게 전달하거나, 자동 알림(웹훅)으로 전송
- 사람 쪽: 링크 열기 → 내용 확인 → 승인/거부 (계정·로그인 없음, 링크 자체가 1회용 토큰)
- 에이전트는 `GET /api/v1/requests/{id}`로 폴링하거나, `callbackUrl`로 결과를 받습니다
- MCP 서버에서는 `@appmonster/approval`의 `approverFromEnv()`를 `approveWrite` 훅에 꽂으면 끝 (kmcp의 naver-commerce / cafe24 가 이미 이 방식)

## API

인증: `Authorization: Bearer <API_KEY>` (키는 `OKAGENT_API_KEYS` 환경변수, `key:user` 쌍을 콤마로 구분)

### `POST /api/v1/requests` — 승인 요청 만들기

```json
{
  "title": "네이버 재고 변경: 블랙 L 12 → 0",
  "description": "품절 처리 요청. 주문 3건 대기 중",
  "action": "naver_update_stock",
  "payload": { "originProductNo": 123, "stockQuantity": 0 },
  "amount": 0,
  "currency": "KRW",
  "source": "naver-commerce",
  "expiresIn": 600,
  "callbackUrl": "https://agent.example.com/hooks/okagent"
}
```

응답 `201`:

```json
{ "id": "req_…", "status": "pending", "approveUrl": "https://okagent.app/r/req_…?t=…", "expiresAt": "…" }
```

| 필드 | 설명 |
|---|---|
| `title` (필수) | 사람이 한 줄로 읽을 요약 (≤120자) |
| `action` (필수) | 실행될 도구/작업 이름 (≤120자) |
| `payload` | 실제 인자. 승인 페이지에서 "인자 보기"로 펼쳐 확인 |
| `amount`, `currency` | 금액이 있으면 크게 표시 (기본 KRW) |
| `source` | 요청한 에이전트/서버 이름 |
| `expiresIn` | 초. 기본 600, 최대 7일. 지나면 자동 `expired` |
| `callbackUrl` | 결정되면 `{id,status,note,decidedAt,action}`를 POST |

### `GET /api/v1/requests/{id}` — 상태 조회 (폴링)

`status`: `pending | approved | rejected | expired`

### `GET /api/v1/requests` — 내 대기 중 요청 목록

### `POST /api/v1/requests/{id}/decide` — 승인 페이지가 호출 (링크 토큰 인증)

```json
{ "token": "…", "decision": "approved", "note": "수량 확인함" }
```

이미 결정된 요청이면 `409`, 토큰이 틀리면 `404`.

## 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `OKAGENT_API_KEYS` | ✅ | `키:사용자,키2:사용자2` |
| `OKAGENT_BASE_URL` | ✅ | 승인 링크의 도메인 (`https://okagent.app`) |
| `DATABASE_URL` | 운영 ✅ | Postgres (Neon 등). 없으면 메모리 저장(개발용, 서버 재시작 시 소실) |
| `OKAGENT_NOTIFY_WEBHOOK` | 선택 | 새 요청마다 JSON POST. Slack Incoming Webhook URL 그대로 사용 가능 |
| `OKAGENT_KAKAO_REST_API_KEY` + `OKAGENT_KAKAO_REFRESH_TOKEN` | 선택 | 카카오톡 "나와의 채팅"으로 승인 링크 전송. `npx @appmonster/mcp-kakao auth` 로 받은 refresh token (앱에 Client Secret을 켰다면 `OKAGENT_KAKAO_CLIENT_SECRET`도) |

## 로컬 실행

```bash
pnpm install
OKAGENT_API_KEYS=dev-key:yusung pnpm dev
# 다른 터미널
curl -s -X POST localhost:3000/api/v1/requests -H 'Authorization: Bearer dev-key' -H 'Content-Type: application/json' \
  -d '{"title":"테스트 승인","action":"demo","amount":15000}'
# → approveUrl 을 브라우저로 열어 승인/거부
```

## 배포

[DEPLOY.md](./DEPLOY.md) — Vercel + Neon, 10분.

## 로드맵

- [x] 카카오톡 나에게 보내기 채널 (단일 사용자)
- [ ] 카카오 알림톡 / 앱 푸시 채널 (다중 사용자)
- [ ] 대시보드: 지난 승인 내역, 자동 승인 규칙(금액 ≤ N원이면 자동 OK)
- [ ] 사용자별 API 키 발급 UI (현재: 환경변수)
- [ ] React Native 앱 (잠금화면 알림에서 바로 승인)
