# 2026-11-17 FE/BE 수정분 리뷰 (1차)

대상: `fit-core-frontend`, `fit-core-backend`의 커밋하지 않은 변경 (`develop`). 원래 점검 목록은 `2026-11-16-frontend-gap-review.md`입니다.

## 자동 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 |
| `npx vitest run` | 23개 파일, 229개 테스트 통과 |
| `npm run build` (+ `check-prod-bundle`) | 통과 |
| `./gradlew test --rerun-tasks` | BUILD SUCCESSFUL |

## 브라우저 확인

환경: `fe-mock` (MSW + 데모 로그인), 375×812 모바일 뷰포트.

**정상 동작을 확인한 흐름**
- 로그아웃 상태에서 `/my`에 들어가면 `/login?next=%2Fmy`로 보내고, 데모 로그인 후 `/my`로 돌아옵니다.
- 온보딩: 저장된 값이 미리 채워지고, 단계를 이동할 수 있습니다. 2단계 저장 후에도 닉네임·성별·생년월일·체성분 7건·통증 부위가 그대로 남습니다(병합 확인). 계정별 완료 플래그도 기록됩니다.
- 컨디션 체크 → 생성 → 드래프트 → 저장 → 바로 시작.
- 플레이어
  - 무게를 +2.5 두 번, 횟수를 −1 바꿔 75kg × 7로 기록했습니다.
  - 휴식 +30초가 동작하고, 새로고침 후에도 진행 상태와 타이머가 복원됩니다.
  - 홈의 "이어서 하기" 카드가 나오고, 덮어쓰기 확인 시트도 뜹니다.
  - 조기 종료 → 강도 선택 → 저장 후 기록에 `setIndex 1, 75kg, 7회, rpe 8`이 남습니다.
- 404: 로그인 상태에서 한국어 404 페이지가 나옵니다.
- 설정의 탈퇴 시트: 내용을 확인했고, 실제 탈퇴는 실행하지 않았습니다.

**브라우저로 확인하지 못한 흐름**
- 퀵로그 편집·저장, 식단 수정 후 갱신, 영양제 채팅 새로고침·새 대화, `error.tsx`.
- 탭이 백그라운드로 렌더되면서 스크린샷이 자주 타임아웃돼 시간 안에 끝내지 못했습니다.
- 이 영역은 코드 리뷰만 했습니다(아래 P1-4~6, P2).

---

## P0 — 막힘·데이터 손실

### P0-1. 만료된 토큰으로 플레이어를 새로고침하면 진행 중인 운동이 사라짐 (원래 P0 #3이 아직 남아 있음)

**재현** (브라우저에서 확인)
1. 진행 중인 루틴을 만들고 1세트를 체크합니다. `fitcore_active_routine`과 `fitcore_player_progress`가 저장된 상태입니다.
2. `auth-storage` 토큰을 `exp`가 지난 비데모 JWT로 바꾸고 `/ai_routine/player`를 새로고침합니다. JWT 유효기간이 1시간이고 리프레시가 없어서, 1시간 넘는 운동이나 화면을 껐다 켠 경우 흔히 생기는 상황입니다.
3. 결과
   - `/login?next=%2Fai_routine%2Fplayer`로 이동합니다.
   - `fitcore_active_routine`은 **삭제**되고, `fitcore_player_progress`만 고아로 남습니다.
   - 다시 로그인하면 플레이어가 "진행 중인 루틴이 없어요" 후 `/ai_routine`으로 보냅니다.
   - 홈 이어하기 카드도 뜨지 않습니다(`evaluateUnfinishedWorkout`에서 routine이 null).

**원인**
- `AuthInitializer.tsx:28-31`이 만료 토큰에 대해 경로 예외 없이 `logout()`을 부릅니다. `AuthProvider`에는 플레이어 예외가 있지만 여기에는 없습니다.
- `authStore.logout` → `clearDemoSession()`(`utils/demoMode.ts:552`)이 `fitcore_active_routine`과 `fitcore_split_label`을 지웁니다. `preservingFailedWorkoutSave`는 실패 저장 백업만 지킵니다.
- 같은 이유로 `setToken`(비데모 토큰)도 **실제 계정으로 로그인할 때마다** 진행 중인 루틴을 지웁니다(`authStore.ts:54`).

**기대**: 진행 중인 운동(routine, final id, split label, progress, program context)은 로그아웃과 재로그인을 넘어 남거나, 최소한 같은 계정이 다시 로그인하면 이어할 수 있어야 합니다. `clearDemoSession`은 데모 전용 키만 지워야 합니다.

---

## P1 — 버그

### P1-1. "다시 로그인 후 저장" 후 플레이어로 돌아오면 오류 토스트와 함께 `/ai_routine`으로 튕김
- 위치: `app/ai_routine/player/page.tsx:425-429` (`handleLoginToSave` → `redirectToLogin(PLAYER_PATH)`), `:120-124`.
- 재로그인할 때 P0-1과 같은 경로로 `fitcore_active_routine`이 지워집니다. 그래서 돌아온 플레이어는 실패 저장 백업을 확인하기 전에 "진행 중인 루틴이 없어요"를 띄우고 `/ai_routine`으로 이동합니다.
- 백업은 남아 있어 홈 카드에서 재시도할 수 있습니다. 하지만 화면 문구("홈에서 이번 기록을 그대로 저장할 수 있어요"), 실제 복귀 경로(player), 결과(루틴 생성 화면 + 오류 토스트)가 모두 어긋납니다.
- 기대: 홈(`/`)으로 복귀하거나, 플레이어가 루틴이 없어도 실패 백업이 있으면 재시도 화면을 보여야 합니다.

### P1-2. 실패한 운동 저장 백업이 계정을 넘어 다른 계정에 저장될 수 있음
- 위치: `lib/axios/authRedirect.ts:150` (`preservingFailedWorkoutSave`), `store/authStore.ts:40-55`, `app/components/TodayWorkoutCard.tsx:136`.
- 백업에 계정 정보가 없고, 로그아웃과 다른 계정의 로그인·탈퇴를 모두 넘어 유지됩니다.
- 재현: A의 저장이 401로 실패 → A 로그아웃(또는 탈퇴) → 같은 기기에서 B 로그인 → 홈 카드가 "지난 운동 기록 저장"을 제안 → A의 세트가 B 계정에 저장됩니다.
- 기대: 백업에 계정(JWT `sub`)을 기록하고 같은 계정에만 제안해야 합니다. 탈퇴할 때는 백업을 지워야 합니다.

### P1-3. 영양제 상담 기록이 로그아웃·탈퇴 후에도 같은 탭에 남음 (건강 정보)
- 위치: `utils/supplementChatStorage.ts` (sessionStorage `fitcore_supplement_chat_v1`). `clearSupplementChat`은 `app/ai_supplement/page.tsx`에서만 호출됩니다.
- 재현: A가 복용약 관련 질문 → 로그아웃 → 같은 탭에서 B 로그인 → `/ai_supplement`에 A의 대화가 복원됩니다.
- 기대: `logout`, 탈퇴, 계정 전환 때 지워야 합니다.

### P1-4. DB 항목의 kcal이 0이면 미리보기와 저장값이 다름
- 위치: `utils/dietKcal.ts:39`, BE `DietLogService.java:136-141`.
- FE는 `source:"db"`이고 kcal이 0이면 매크로(4·4·9)로 계산합니다. BE는 같은 경우 manual 분기로 넘어가 `kcal != null`이므로 **0을 저장**합니다.
- 재현: AI가 `{source:"db", kcal:0, protein_g:20, carbs_g:30}` 반환 → 편집 없이 저장. 화면은 200 kcal, DB에는 0 kcal입니다. 데모 저장은 FE 계산을 쓰므로 이 차이가 데모에서는 보이지 않습니다.
- 기대: FE가 kcal이 0 이하인 DB 행을 `kcal: null`로 보내거나, BE를 FE에 맞춰야 합니다.

### P1-5. 영양제 답변을 기다리는 중 "새 대화"를 누르면 이전 질문이 입력칸에 다시 들어감
- 위치: `app/ai_supplement/page.tsx:417-425` (`startNewChat`이 abort하고 입력을 비움), `:391-394` (취소 분기의 `setInputText(question)`).
- 기대: 빈 새 대화. 실제: 빈 대화인데 입력칸에 이전 질문이 들어 있습니다.

### P1-6. 생성에 실패해도 진행 중인 프로그램 운동의 프로그램 연결이 사라짐
- 위치: `app/ai_routine/generator/page.tsx:241`. `clearProgramContext()`가 `generateRoutine`보다 먼저 실행됩니다.
- 새 덮어쓰기 흐름에서 이 경우에 도달할 수 있게 됐습니다: 진행 중인 프로그램 운동 → "새로 시작" → 생성 실패 → "이어서 하기"로 저장하면 프로그램 항목에 연결되지 않습니다.
- 기대: 생성에 성공해 `writeActiveRoutine`을 할 때만 지워야 합니다.

### P1-7. 탈퇴한 계정의 운동·식단 기록이 BE에 남음 — 정책·문구 확인 필요
- 위치: `UserService.withdrawMe`. 프로필 익명화와 소셜 연동 삭제만 하고, 운동·식단·루틴 데이터는 그대로입니다.
- 탈퇴 시트는 "다시 볼 수 없게 돼요, 완전 삭제는 메일 문의"라고 정직하게 안내합니다. 다만 `/privacy`의 보관·파기 조항이 이와 맞는지 확인해야 합니다. 건강 관련 정보라 법무 판단이 필요합니다.
- JWT는 무상태라 탈퇴 후에도 만료 전까지 유효합니다. 사용자 조회를 하지 않는 엔드포인트(예: `POST /api/workouts`)가 탈퇴한 userId로 쓰기를 받을 수 있습니다. 확인하지 않았습니다.

---

## P2 — 개선

1. **로그아웃 상태에서 없는 경로에 들어가면 404 대신 로그인으로 보냄** (`authRedirect.isPublicPath`). 로그인 후 404가 나옵니다. 브라우저에서 확인했습니다.
2. **온보딩 가드가 여전히 홈에만 있음** (`app/page.tsx:18`). 원래 목록의 "홈에서만 검사"가 남아 있습니다. 미완료 사용자가 `/workout` 같은 다른 경로로 바로 들어가면 우회됩니다.
3. **`/signup`이 공개 경로에서 빠짐.** 이전 `AuthProvider` 목록에는 있었습니다. 현재 라우트가 없으므로 영향은 없고 기록만 남깁니다.
4. **퀵로그 숫자에 상한 검증이 없음** (`QuicklogItemSheet.tsx:55-66`). BE는 kcal ≤ 5000, 매크로 ≤ 1000, g ≤ 5000으로 제한합니다. 한 항목이 400을 받으면 전체 저장이 실패하고, 어느 항목이 문제인지 알려 주지 않습니다.
5. **날짜를 지우면 퀵로그 저장 버튼이 "0월 0일 식단으로 저장"** (`app/ai_quicklog/page.tsx:580`). 저장 자체는 막힙니다.
6. **DB kcal이 소수면 BE `Integer`로 잘려 화면값보다 1 낮게 저장될 수 있음** (`quicklogDraft.ts:131`). Jackson 설정을 확인하지 않았습니다.
7. **퀵로그·영양제에서 녹음 중 페이지를 떠나면 마이크가 켜진 채 남음.** unmount 정리에서 `MediaRecorder.stop()`과 트랙 stop을 하지 않습니다.
8. **영양제 "다시 보내기"가 입력 중이던 글을 지움** (`page.tsx:411-415` → `setInputText("")`).
9. **영양 추이에서 7일↔30일을 빠르게 바꾸면 이전 응답이 덮어씀** (`NutritionTrendSection.tsx:117-145`). 평균과 달성률이 `from..to`로 필터되지 않습니다.
10. **드래프트 무게 오류 문구가 서로 맞지 않음** (`draftEditing.ts:77`). 배너는 "0~500kg", 입력 검증은 0을 거부합니다.
11. **컨디션 체크 재시도 시 사용자가 지운 근육통이 되살아날 수 있음** (`app/ai_routine/page.tsx:31`, `{...condition.doms, ...prev}`). 확인하지 않았습니다.
12. **데모에서 식단을 수정해도 source가 그대로 남음** (`dietApiClient.ts:94-95`). BE는 manual로 바꿉니다.
13. **데모 토큰이 여전히 `ROLE_ADMIN`이고, 데모 로그인이 기본으로 노출됨** (`utils/demoMode.ts:514`, `app/login/page.tsx:19`). 원래 P2 항목이 남아 있습니다.
14. **BE `updateProfile` 병합으로 스칼라 필드를 null로 되돌릴 수 없음** (예: `birthDate`, `bodyWeightKg` 삭제). 주석에 명시돼 있습니다. FE 어디에서도 "지우기"를 제공하지 않는지 확인이 필요합니다.

## 문제없이 확인한 항목
- FE→BE 공개 필드는 `currentPainAreas`, `currentDoms`, `unavailableEquipment`를 유지합니다. `setIndex`는 1부터 시작합니다. 근육 slug는 골든 화이트리스트와 일치합니다.
- `finalRoutineToDraft`는 렌더 계약 필드를 모두 유지합니다.
- kcal 계산(4·4·9, 반올림)은 BE와 같습니다. 단, P1-4의 0 kcal은 예외입니다.
- 401 인터셉터는 운동 저장과 플레이어에서 세션을 유지합니다. 반환 경로 정리는 `//`, `\`, 절대 URL, `/login`·`/oauth2`를 차단합니다.
- 역할 쿠키는 Max-Age를 갖고, 재수화할 때 다시 설정됩니다. `proxy.ts`는 쿠키가 없으면 `?next`를 붙여 로그인으로 보냅니다.
- BE 탈퇴: 이메일을 익명화해 unique 충돌 없이 재가입할 수 있습니다. 소셜 연동을 삭제한 뒤 soft delete합니다.
- BE 정렬: 체성분 측정일 null을 `nullsFirst`로 처리합니다.
