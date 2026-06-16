# fit-core 프로젝트 백로그

> 우선순위 기준: 포트폴리오 가치 / 완성도 (긴급도 아님)  
> P1=기능 완성도 · P2=UX/내비 품질 · P3=운영·데이터 견고화  
> 규모: S(~1h) · M(반나절) · L(1일+)

---

## 1. 완료됨 (Done) — 17건

| # | 항목 | 코드 근거 |
|---|------|-----------|
| ✅ | FE Vercel / BE Hetzner / AI=PC+Tailscale / DB=VM MariaDB 배포 | `docker-compose.prod.yml`, Caddyfile |
| ✅ | 403 CORS 수정 (`setAllowedOriginPatterns`) | BE SecurityConfig |
| ✅ | AI 4기능 graceful fallback (AI 다운 시 안내) | `AiStatusIndicator.tsx`, player fallback 처리 |
| ✅ | prod/local env 분리 + P0 환경변수 교정 | `.env.local`, `backendBaseUrl.ts` |
| ✅ | AI 4기능 로컬 실동작 (routine / quicklog-parse / supplement RAG / STT) | `fit-core-ai/main.py` |
| ✅ | `alert()` 14건 → sonner toast 교체 | `app/layout.tsx` Toaster, `app/my/`, `app/admin/exercises/`, `components/AuthProvider.tsx` |
| ✅ | 어드민 죽은 "회원 관리" 버튼 제거 | `app/admin/page.tsx` (Users import 제거) |
| ✅ | Player 나가기 버튼 + `fitcore_player_progress` 영속화 | `app/ai_routine/player/page.tsx:54,204` |
| ✅ | Draft 뒤로가기 버튼 + confirm 대화상자 | `app/routine/draft/page.tsx:338-358` |
| ✅ | `fitcore_failed_workout_save` 고아 키 정리 | `app/ai_routine/player/page.tsx` handleSaveLater |
| ✅ | 프로필 strength baseline 중량 input step 수정 (`step="any"`, `min={0}`) | `app/my/profile/ProfileEditForm.tsx` |
| ✅ | 헤더 AI 서버 상태 표시등 | `components/AiStatusIndicator.tsx`, `app/components/header.tsx` |
| ✅ | `/ai_routine/generator` 프롬프트 설계 보기 버튼 제거 | `app/ai_routine/generator/page.tsx` |
| ✅ | 401 응답 시 자동 로그아웃 처리 | `lib/axios/AxiosController.ts:115-128` |
| ✅ | 세션 만료 toast 표시 | `components/AuthProvider.tsx:43` |
| ✅ | demo 모드 workout 저장 localStorage 분기 | `lib/api/workout/workoutApiClient.ts:37-74` |
| ✅ | QuickLog 저장 연동 지점 분석 | `docs/quicklog_save_integration_analysis.md` |

---

## 2. 열린 항목 (Backlog)

### P1 — 기능 완성도

| ID | 영역 | 무엇 | 왜 | 근거 | 규모 | 의존성 |
|----|------|------|----|------|------|--------|
| P1-1 | QuickLog | **운동 저장 실연결** — `handleSaveLog()` setTimeout 제거 후 `workoutApiClient.save()` 호출 | 핵심 기능이 UI 껍데기 상태. 포트폴리오에서 가장 먼저 눈에 띄는 미완성 | `app/ai_quicklog/page.tsx:144-157` | M | P1-2 선행 필요 |
| P1-2 | QuickLog | **운동명 → exerciseId 매칭** — `GET /api/exercises/catalog` 조회 후 nameKr/nameEn 정규화 매칭, 실패 시 해당 세트 skip + toast 경고 | `WorkoutSetRequest.exerciseId @NotBlank` 필수 · 매칭 없으면 P1-1 자체가 불가 | `quicklog_save_integration_analysis.md §4`, `ExerciseTierRepository.java` (findByNameKr 없음) | M | 없음 |
| P1-2a | QuickLog (대안) | **AI 서버에서 exercise_id 반환** — `POST /api/ai/parse-log` 응답에 `exercise_id` 추가 | 한국어 변형("벤치"/"벤치프레스") 처리를 AI가 담당해 매칭 품질이 높음 | `quicklog_save_integration_analysis.md §8 대안B` | M | AI 서버 수정 필요 (P1-2의 대안) |
| P1-3 | QuickLog | **reps null / weightKg ≤ 0 처리** — null 세트 skip 로직, 맨몸운동 weightKg 생략 | BE `@NotNull reps`, `weightKg > 0` 제약. 처리 없으면 400 에러 | `WorkoutSetRequest.java:38-39`, `quicklog_save_integration_analysis.md §3` | S | P1-1 동반 처리 |
| P1-4 | QuickLog | **demo 모드 분기** — `isDemoMode()` 체크 추가 | demo 토큰 → BE 401 발생. `workoutApiClient.save()` 재사용 시 자동 해결 | `quicklog_save_integration_analysis.md §6`, `demoMode.ts:384` | S | P1-1 동반 처리 |
| P1-5 | 식단 | **diet_logs 저장용 BE 신규 구축** — `diet_log` 엔티티 + 마이그레이션 + `POST /api/diet-logs` + 일별 집계 응답 | BE에 식단 관련 테이블/API 전무. QuickLog diet 파싱 결과 화면만 있고 저장 불가 | `quicklog_save_integration_analysis.md §2` ("없음"), BE 전체 탐색 | L | BE+FE 양측 작업 |

---

### P2 — UX / 내비게이션 품질

| ID | 영역 | 무엇 | 왜 | 근거 | 규모 | 의존성 |
|----|------|------|----|------|------|--------|
| P2-1 | 에러 상태 | **에러 vs 빈 상태 구분 + 재시도** — API 실패(네트워크/500)와 데이터 없음(빈 배열)을 다른 UI로 표시, 에러 시 재시도 버튼 | 현재 에러도 빈 화면으로 보여 사용자가 버그인지 정상인지 구분 불가 | `app/my/page.tsx` 로딩/빈 상태 없음 (grep 결과: isLoading/Skeleton 미사용) | M | 없음 |
| P2-2 | 로딩 상태 | **Skeleton / 스피너 누락 보완** — /my 운동 목록, 체성분, PR 영역에 로딩 스켈레톤 추가 | 데이터 fetch 중 빈 화면 flash 발생 | `app/my/page.tsx` (Skeleton 미사용) | S | 없음 |
| P2-3 | 닉네임 검증 | **경쟁조건 제거** — 닉네임 debounce 확인 중 동시에 저장 시 서버 중복 검증 재호출 | `checkNickname` debounce 없이 useEffect 즉시 실행, 저장 버튼도 `checkNickname` 재호출 (이중 요청) | `app/my/profile/ProfileEditForm.tsx:157-192` | S | 없음 |
| P2-4 | 요청 중복 | **QuickLog / generator 중복 요청 방지** — AbortController 또는 버튼 disable 처리 | generator는 `disabled={status === "loading"}` 처리되어 있으나, QuickLog parse 버튼은 isLoading 중 재클릭 가능 | `app/ai_quicklog/page.tsx`, `app/ai_routine/generator/page.tsx:421` | S | 없음 |
| P2-5 | 버튼 비활성 | **비활성화 사유 안내** — generator 생성 버튼이 targetMuscles 없을 때 disabled되지만 왜 안 되는지 설명 없음 | `app/ai_routine/generator/page.tsx:421` `disabled={... || formData.targetMuscles.length === 0}` — tooltip/안내 문구 없음 | S | 없음 |
| P2-6 | 내비게이션 | **generator 뒤로가기 버튼** — generator 상단에 `router.back()` 버튼 추가 | draft와 달리 generator는 뒤로가기 없음. 모바일에서 제스처 외 탈출 경로 없음 | `app/ai_routine/generator/page.tsx` (ArrowLeft 없음) | S | 없음 |
| P2-7 | 내비게이션 | **admin 뒤로가기 버튼** — `/admin`, `/admin/exercises` 상단 뒤로가기 추가 | 진입 후 헤더 logo로만 이탈 가능 | `app/admin/page.tsx`, `app/admin/exercises/page.tsx` (ArrowLeft 없음) | S | 없음 |
| P2-8 | 내비게이션 | **마법사 단계 표시 (1/N)** — generator 입력 폼이 여러 섹션으로 구성되지만 전체 맥락 표시 없음 | 사용자가 얼마나 남았는지 모르고 이탈 | `app/ai_routine/generator/page.tsx` 섹션 구조 있으나 progress bar 없음 | S | 없음 |
| P2-9 | 내비게이션 | **ProfileEditForm 탭 전환 경고** — 편집 중 탭(섹션) 이동 시 미저장 알림 | form dirty state 있으나 섹션 이동 시 경고 없음 | `app/my/profile/ProfileEditForm.tsx` (activeTab 없음 → 단일 긴 폼이므로 실제 영향 재확인 필요) | S | 구조 재확인 후 |
| P2-10 | 모달 통일 | **`window.confirm()` → 스타일 모달 교체** — 현재 2곳에서 네이티브 confirm 사용 | 브라우저 기본 다이얼로그는 디자인 일관성 파괴 | `app/ai_routine/player/page.tsx:204`, `app/routine/draft/page.tsx:339`, `app/admin/exercises/page.tsx:227` | M | 없음 |
| P2-11 | 내비게이션 | **생성 중 이탈 시 active_routine 정리** — generator에서 생성 완료 전 이탈해도 `fitcore_active_routine` localStorage에 잔존 가능 | 오래된 draft가 다음 세션에 자동 로드되어 혼란 | `app/ai_routine/generator/page.tsx:211` (setItem만 있고 cleanup 없음) | S | 없음 |
| P2-12 | 내비게이션 | **draft→generator 재생성 덮어쓰기 UX** — draft에서 "재생성" 시 기존 draft가 소리 없이 교체됨. 확인 없음 | 실수로 수정 중이던 draft를 잃을 수 있음 | `app/routine/draft/page.tsx` 재생성 버튼 흐름 | S | 없음 |
| P2-13 | 세션 만료 | **로그인 화면에서 만료 toast 표시 개선** — 현재 401 발생 시 `window.location.href = "/login"` 리다이렉트 후 toast 없음 | 로그인 화면에서 "왜 여기 왔지?" 혼란. AuthProvider toast는 마운트 타이밍 이슈 있음 | `lib/axios/AxiosController.ts:119-126`, `components/AuthProvider.tsx:43` | S | 없음 |
| P2-14 | 추천 질문 | **supplement 추천 질문 하드코딩 → 사용자 컨텍스트 기반** — 현재 4개 고정 문구 | AI 코치가 유저 영양제 정보 모르는 상태에서 고정 질문은 어색함 | `app/ai_supplement/page.tsx:37-42` SUGGESTED_QUESTIONS | S | 없음 |
| P2-15 | 체성분 | **체성분 전용 엔드포인트 분리** — 현재 `PATCH /api/users/profile/me` 전체 프로필에 bodyCompositionSnapshot 배열 포함해서 저장 | 체성분 1건 추가할 때 전체 프로필 전송 비효율. 추후 다수 기기 동기화 문제 | `app/my/page.tsx:68-77`, BE `UserController.java:49` (`PUT /profile/me` 단일 엔드포인트) | M | BE 신규 엔드포인트 필요 |

---

### P3 — 운영 / 데이터 견고화

| ID | 영역 | 무엇 | 왜 | 근거 | 규모 | 의존성 |
|----|------|------|----|------|------|--------|
| P3-1 | 보안 | **BE↔AI shared secret** — BE가 AI 서버 호출 시 `X-Internal-Secret` 헤더 검증 (AI 엔드포인트 노출 방지) | 현재 AI FastAPI 엔드포인트가 인증 없이 공개 상태. secret 없음 | `fit-core-ai/main.py` (인증 헤더 없음), BE AI 호출 코드 | M | BE + AI 양측 |
| P3-2 | AI 안정성 | **AI concurrency guard + ai_busy fallback** — 동시 LLM 요청 수 제한(Semaphore), 초과 시 503 반환 | Ollama 단일 스레드 모델 → 동시 요청 시 응답 지연/실패. `main.py`에 semaphore 없음 | `fit-core-ai/main.py` (Semaphore 없음), AiStatusIndicator polling이 이미 down/up 구분 | M | AI 서버만 |
| P3-3 | 운영 | **PC 부팅 시 AI서버/Ollama/Tailscale 자동 시작** — Windows 작업 스케줄러 또는 서비스 등록 | PC 재부팅 후 수동 실행해야 AI가 살아남 | `fit-core-ai/main.py` 수동 uvicorn 실행 방식 | S | Windows 환경 |
| P3-4 | 데이터 | **핵심 localStorage 상태 → BE 동기화** — `fitcore_active_routine`, `fitcore_doms_data`, `fitcore_pain_areas` 등 기기 이동/캐시삭제 시 소실 | 새 기기 또는 시크릿 모드에서 진행 중 루틴/DOMS 맥락 사라짐 | `demoMode.ts`, `app/ai_routine/player/page.tsx` localStorage 의존 | L | BE 신규 상태 저장 API 필요 |
| P3-5 | 보안 | **admin 엔드포인트 역할 검증 FE** — `/admin` 진입 시 ROLE_ADMIN 체크 없이 router 접근 가능 (BE에서만 막음) | UX 차원에서 비어드민은 접근 자체를 막아야 함 | `app/admin/page.tsx` (useAuthStore role 체크 없음) | S | 없음 |

---

## 3. 권장 진행 순서

```
[묶음 1 — QuickLog 실연결]  (P1-2 → P1-1 → P1-3 + P1-4)
  └ P1-2: exerciseId 매칭 유틸 구현 (또는 P1-2a AI서버 방식 채택 결정)
  └ P1-1: handleSaveLog 실 API 연결 (workoutApiClient.save 재사용)
  └ P1-3 + P1-4: null 처리 + demo 분기 (P1-1 동반 처리)

[묶음 2 — UX 빠른 승리]  (P2-1~5, 각각 독립)
  └ P2-1: 에러 vs 빈 상태 구분 (/my 중심)
  └ P2-3: 닉네임 debounce 경쟁조건
  └ P2-6 + P2-7: generator/admin 뒤로가기 버튼
  └ P2-11: generator 이탈 시 active_routine 정리

[묶음 3 — 내비게이션 품질]  (P2-10 → P2-12 → P2-13)
  └ P2-10: confirm() → 스타일 모달 통일 (3곳 한 번에)
  └ P2-12: draft 재생성 확인 UX
  └ P2-13: 세션 만료 toast 개선

[묶음 4 — 운영 견고화]  (P3 계열, 독립)
  └ P3-3: PC 자동 시작 (가장 쉬움)
  └ P3-1 + P3-2: shared secret + concurrency guard (BE+AI 동시 작업)
  └ P3-5: admin FE role 체크 (S)

[묶음 5 — 대형 기능]  (충분한 시간 확보 후)
  └ P1-5: 식단 저장 BE 신규 구축 (L — 독립 스프린트)
  └ P2-15: 체성분 전용 엔드포인트 (M — P1-5와 별개)
  └ P3-4: localStorage → BE 동기화 (L — 아키텍처 결정 필요)
```

> **한 번에 한 티켓 원칙**: 각 묶음 내에서도 PR은 한 항목씩.  
> P1-2a(AI서버 방식) 채택 여부는 P1-1 착수 전에 결정 필요 — 방향에 따라 구현 경로가 완전히 달라짐.
