# Fit Core — Design

상태: 리디자인 완료(2026-11-08). 전 화면이 아래 토큰·컴포넌트로 교체됐고, Impeccable 최종 리뷰를 거쳤다(1차 fix 8건 → 2차 fix 3건 → 3차 ship, ship은 마지막 수정분 채점 기준).

## Direction contract

- THESIS: 루틴은 지하철 노선이다. 운동은 역, 세트는 정차점, 다음 회차는 환승. 피트니스 앱의 기본형(카드 더미 + 표 + 파란 버튼)을 거부하고, 사용자가 매일 읽는 노선도의 문법으로 "지금 어디고 다음은 어디인가"를 보여준다.
- OWN-WORLD: 흰 바탕과 잉크 네이비, 분할별 노선 색 4개(밀기 파랑, 당기기 초록, 하체 주황, 코어·전신 보라), 굵은 노선 막대와 링 모양 역 표시, Pretendard 한 가족, 폭 고정 숫자.
- STORY: 사용자는 오늘 탈 노선(루틴)을 보고, 역 순서를 다듬고, 출발해서 역마다 세트를 정차하며 종점까지 간다. 프로그램은 여러 노선을 갈아타는 환승 노선도다.
- FIRST VIEWPORT: 홈은 "오늘의 노선" 패널(분할 배지, 루틴 이름, 가로 노선과 역 이름, 출발 버튼)이 최상단. 운동 중 화면은 세로 노선 위 현재 역이 크게 펼쳐지고(중량·횟수 대형 숫자, 정차점), 하단에 휴식 시간과 세트 완료 버튼.
- FORM: 지하철 노선도. concept-seed 롤은 실행하지 않았다(검증되지 않은 런처 바이너리를 실행하지 않기로 함). 방향은 사용자가 세 안(인바디 결과지·원판 색상·지하철 노선도) 중 C를 직접 골랐으므로 다시 롤하지 않는다.
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 노선 규칙

- 분할 → 노선 색: push·chest·shoulder = 밀기, pull·back = 당기기, legs·lower = 하체, core·neck·full_body = 코어·전신. upper·chest_back·arm·custom은 비중이 큰 쪽, 판단 불가면 잉크.
- 노선 은유는 운동 흐름(홈의 오늘 노선, 루틴 결과, 운동 중, 프로그램, 운동 기록 캘린더 점)에만 쓴다. 식단·영양제·마이·온보딩은 같은 글꼴·색·밀도만 쓰고 노선을 억지로 넣지 않는다.
- 인체 다이어그램(`app/components/AnatomyModel.tsx`): 컨디션 체크는 정상 `rail` · 뻐근함 `ink-2` · 근육통 `ink` · 통증(프로필, 잠금) `danger`. 생성기에서 고른 부위는 근육별 노선 색(분류 없으면 `ink`). 범례와 칠은 같은 상수를 쓴다. 레이어를 겹쳐 블렌드하지 않는다.
- `lower-back`은 코어 노선으로 분류한다(코어 프리셋과 일치).
- 컨트롤은 웹 표준(버튼, 탭, 입력, 시트). 노선도 장식으로 컨트롤을 대체하지 않는다.

## 토큰 (`app/globals.css` `@theme`)

| 역할 | 토큰 | 값 |
|---|---|---|
| 잉크(본문) | `ink` | `#14213d` |
| 보조 글자 | `ink-2` | `#5b6478` (흰 바탕 5.9:1) |
| 흐린 글자(장식·비필수만) | `ink-3` | `#8a93a6` |
| 바탕 / 보조 면 | `ground` / `surface` | `#ffffff` / `#f4f6f9` |
| 구분선 / 비활성 노선 | `hairline` / `rail` | `#e3e7ee` / `#c9d1de` |
| 밀기 / 당기기 / 하체 / 코어 | `line-push` / `line-pull` / `line-legs` / `line-core` | `#0052a4` / `#00875a` / `#b9520a` / `#8e5bb5` |
| 위험 | `danger` / `danger-ink` / `danger-bg` | `#d92d20` / `#7a271a` / `#fef3f2` |

- 노선 색은 모두 흰 글자 대비 4.5:1 이상.
- 글자: `caption` 12, `body-sm` 14, `body` 16, `title-sm` 19, `title` 23, `headline` 28, `display` 48(운동 중 숫자 전용). 굵기 400/500/700만.
- radius: `control` 6px(버튼·입력), `panel` 12px(시트·면). 원형은 역 표시에만.
- 그림자: 하단 시트에만. 그라디언트·영문 대문자 eyebrow·`→` 붙은 버튼 문구·이모지 아이콘 금지.
- 전역: `word-break: keep-all`, 키보드 포커스 링(밀기 파랑 2px).

## 공통 컴포넌트 (`components/ui`)

새 화면과 교체되는 화면은 아래만 쓴다. 개발 서버의 `/dev/ui`에서 전부 볼 수 있다(프로덕션은 404).

| 컴포넌트 | 쓰임 |
|---|---|
| `Button` / `ButtonLink` | primary(잉크 또는 `line` 노선색) · secondary · ghost · danger · danger-ghost, md 44px / lg 52px, `disabled`·`aria-disabled` 동일 표시 |
| `Surface` / `Section` | 테두리 흰 면 또는 보조 면, 섹션 제목 |
| `TextField` / `TextAreaField` | label 연결, 힌트·오류(`aria-describedby`), 단위 접미사 |
| `LineBadge` / `Tag` / `ToggleChip` | 분할 배지, 보조·위험 태그, `aria-pressed` 다중 선택 |
| `Sheet` | 네이티브 `<dialog>` 하단 시트(포커스 가두기, Esc, 배경 스크롤 잠금) |
| `Skeleton` / `EmptyState` / `Notice` | 로딩, 빈 상태, 안내·위험 알림 |
| `Route` / `RouteStrip` | 세로 노선(plan / progress, 역별 노선으로 환승), 가로 요약 노선 |

분할 → 노선 결정은 `utils/routeLine.ts`의 `lineForRoutine`(직접 분할은 고정, 혼합 분할은 부위 과반, 동률은 `mixed`). 저장 루틴 출발은 `utils/routinePlay.ts`의 `prepareFinalRoutineForPlay`.

- 운동 중 화면: 현재 역에 "세트 N / M"(title-sm)과 `중량 kg × 횟수 회`(display, 둘 다 잉크). 휴식 중에는 같은 자리가 display 카운트다운과 "다음 중량 × 횟수"(title)로 바뀐다. 대기 중에는 0:00 대신 "끝나면 휴식 m:ss". 지나온 구간과 현재 역 링은 노선 색, 남은 구간만 `rail`. 근거 설명은 셰브론 달린 접기 뒤.
- 홈·운동 탭 첫 화면: "오늘의 노선"(없음은 회색 안내 노선, 예정은 저장 루틴 노선과 출발, 완료는 지나온 역과 "종점 도착") → "이번 주 운행"(요일 역을 잇는 가로 노선) → 코치 한 줄.
- 알림(`Notice`)은 측면 띠 없이 전체 테두리 + 면 + 아이콘. eyebrow 라벨 금지.
- 셸: 헤더는 `fit-core` 워드마크(잉크 링 + 글자)와 AI 상태 라벨, 하단 내비는 잉크 상단 막대로 활성 표시. 데스크톱은 `surface` 바탕 위 480px 앱 열.
- 브랜드 색 예외: 소셜 로그인 버튼(카카오·네이버·구글)만 각 사의 가이드 색을 쓴다.
- 채팅형 화면(말로 식단 기록, 영양제 코치): 사용자 말풍선 잉크, AI 말풍선 `surface`, 입력줄 44px.

## 표시 문구

- 계약 코드(부위 slug, 장비, 분할, 목표, 경력, 컨디션, 세트 종류, 끼니, 폴백 사유)는 `utils/displayLabels.ts`를 거쳐서만 화면에 나간다. 전송 값은 SSOT 코드 그대로.
- 모르는 코드는 원문을 보여주지 않는다(`기타 부위`, `루틴` 등). 성공 상태(`none`)에는 아무 문구도 붙이지 않는다.
- 분할 필드로 제목을 만들 때는 `splitTitle`(코드 → "밀기 루틴", 한글 자유 텍스트는 그대로, 그 밖은 null).
- 영문 대문자 eyebrow·장식 칩은 쓰지 않는다. 단위는 소문자 `kg`/`lbs`.
- 남은 한계: AI가 쓰는 운동명(`exerciseName`)과 설명문 안의 코드 토큰(`push`, `DOMS moderate`, `MACHINE`)은 FE에서 바꿀 수 없다. BE/AI 계약 작업으로 따로 다룬다.
