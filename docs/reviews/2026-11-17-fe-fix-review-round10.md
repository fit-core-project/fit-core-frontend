# 2026-11-17 리뷰 (10차: 영양제 상담 대화 맥락, FE·BE·AI)

대상
- `fit-core-frontend`: `utils/supplementHistory.ts`, `app/ai_supplement/page.tsx`, 데모 후속 질문 처리
- `fit-core-backend`: `AiController` 전달 경로와 테스트
- `fit-core-ai`: `main.py`의 `ChatTurn`/`SupplementChatRequest`, `engines/supplement_history.py`
- 골든: `supplement-chat.request.golden.json`

`engines/supplement/*`, `engines/food/*`, `diet_parser`, `scripts/eval`, `tests/test_supplement_*`는 다른 세션 담당이라 읽기만 했습니다.

**결과: P0 0건, P1 0건, P2 1건. 정책 항목 1건(개인정보 보관 기간)은 그대로 남음.**

## 자동 검증

| 항목 | 결과 |
|---|---|
| FE `npx tsc --noEmit` | 통과 |
| FE `npx vitest run` | 417/417 통과 |
| FE `npm run build` | 통과 |
| BE `./gradlew test` | BUILD SUCCESSFUL |
| AI `pytest tests/test_chat_history_contract.py` | 17 passed. 전체 1103건은 다른 세션 작업과 겹쳐서 돌리지 않음 |
| 골든 | ✅ 루트와 FE 사본의 MD5가 같음(`12117b35…`). 내용은 `{question, history:[{role:"user"|"assistant", content}]}` |

## 계약 일관성

| 계층 | 확인 |
|---|---|
| FE | 요청 `{question, history}`. history 규칙은 아래 참고 |
| BE | `forwardToPythonServer`가 본문을 JSON으로 다시 직렬화해 그대로 전달. 로그에는 길이만 남김(`request_body_length`) |
| AI | `history: list[ChatTurn]`, 기본값 `[]`, `null`이면 `[]`. 최근 12턴만 남기고, 내용은 2000자까지 자름. role이 `user`/`assistant`가 아니면 422 |
| 응답 | 바뀌지 않음 |

**FE history 규칙**
- 최근 6턴, 각 500자까지 보냅니다.
- 환영 메시지, 오류 말풍선, 데모 답변은 뺍니다.
- "다시 보내기"를 하면 실패한 질문과 오류 말풍선을 뺍니다.
- FE 상한(6턴, 500자)이 AI 상한(12턴, 2000자)보다 작으므로, FE가 보낸 history가 AI에서 잘리는 일은 없습니다.

## 개인정보 (로그)
- **AI**
  - 질문은 기존대로 `summarize_text_for_log`(글자 수만)로 남깁니다.
  - history는 `turns=N follow_up_rewritten=bool`만 남깁니다.
  - 422 처리기의 마스킹 대상에 `history`와 `content`가 추가됐습니다.
  - `supplement_engine.py`의 로그는 예외 요약만 남기고, 질문 원문은 남기지 않습니다.
- **BE**: 요청 본문을 기록하지 않습니다(길이·상태·소요 시간만). 직렬화가 실패해도 길이만 남깁니다.
- **FE**: 대화는 기존대로 sessionStorage에만 있습니다. 로그아웃하거나 계정이 바뀌면 지워집니다. 브라우저에서 비데모 계정으로 전환하면 대화가 비워지는 것을 확인했습니다.

## 브라우저 확인

환경: `fe-mock`, 375×812 모바일 뷰포트. 비데모는 가짜 JWT와 XHR 가로채기로 흉내 냈습니다.

| 시나리오 | 결과 |
|---|---|
| 데모 "마그네슘 먹어도 돼?" → "그럼 언제 먹어요?" | ✅ 두 번째 질문도 마그네슘 예시 답변. 요청 0건 |
| 새로고침 → "부작용은요?" | ✅ 대화가 복원되고, 후속 질문도 마그네슘으로 이어짐 |
| 새 대화 → "그럼 언제 먹어요?" | ✅ 이전 맥락을 쓰지 않고 기본 예시 답변 |
| 비데모 첫 질문 | ✅ `{question:"마그네슘 먹어도 돼?", history:[]}` |
| 비데모 두 번째 질문 | ✅ `history:[user "마그네슘 먹어도 돼?", assistant "답변 1"]` |
| 두 번째 질문 500 → "다시 보내기" | ✅ 다시 보낸 요청의 history에 실패한 질문과 오류 말풍선이 없음(위와 같은 2턴) |
| 이어서 "부작용은요?" | ✅ history 4턴(첫 질문, 답변 1, 다시 보낸 질문, 답변 3) |

---

## P2 — 개선

### P2-1. 영양제 이름이 없는 질문은 모두 직전 영양제 질문으로 바뀜 (주제 전환·인사 포함)
- 위치: `fit-core-ai/engines/supplement_history.py` `resolve_follow_up_question`, 같은 규칙의 데모용 `resolveDemoFollowUpQuestion`.
- 성분 엔터티가 없는 질문이면 무엇이든 직전 사용자 질문의 성분을 앞에 붙입니다.
- 재현: history가 [user "마그네슘 먹어도 돼?"]일 때 결과(AI resolver를 직접 실행해 확인)

  | 질문 | 결과 | 판단 |
  |---|---|---|
  | "그럼 언제 먹어요?" | "마그네슘 관련 추가 질문: 그럼 언제 먹어요?" | ✅ 의도대로 |
  | "임신 중인데 괜찮아?" | 마그네슘으로 바뀜 | ✅ 적절 |
  | "타이레놀이랑 같이 먹어도 돼?" | 마그네슘으로 바뀜 | ✅ 적절 |
  | **"다른 영양제도 알려줘"** | 마그네슘으로 바뀜 | ❌ 다른 성분을 물었는데 마그네슘 답 |
  | **"수면에 좋은 영양제 추천해줘"** | 마그네슘으로 바뀜 | ❌ 범위가 넓은 추천 질문인데 마그네슘 답 |
  | **"고마워요"** | 마그네슘으로 바뀜 | ❌ 인사인데 마그네슘 답 |

- 데모에서도 "다른 영양제도 알려줘"에 마그네슘 예시가 다시 나왔습니다(브라우저 확인).
- 안전에는 문제가 없습니다(주의 문구는 유지됨). 다만 사용자가 주제를 바꾸면 답이 엉뚱해집니다.
- 기대: 다음과 같은 경우는 다시 쓰지 않아야 합니다.
  - 주제 전환 표현("다른", "말고", "추천", "어떤 영양제")이 있는 질문
  - 인사나 감사 표현만 있는 짧은 질문
  - 범주 질문(수면·피로 등 효능 키워드)

## 남은 항목
- **개인정보 보관 기간(정책)**: 사용자가 결정할 사항입니다.
