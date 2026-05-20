# Golden API Fixture Pack v3.0

작성일: 2026-05-19  
상태: active

## 목적

이 폴더는 Fit-Core MVP 루틴 생성/수정/확정/운동 저장 흐름의 active golden JSON 묶음이다.

## v3.0 결정

- public request는 `currentPainAreas + currentDoms`를 유지한다.
- `bodyPartConditions[]`는 backend/AI 내부 normalize shape다.
- 근육/통증/DOMS 부위 값은 FE 라이브러리 기준 slug를 public/adapter/DB 후보 조회까지 직렬로 사용한다.
- legacy enum 값(`CHEST_UPPER`, `CHEST_MID`, `CHEST_LOWER`, `ARM_TRICEPS`, `LEG_QUADS` 등)은 active contract에서 사용하지 않는다.
- `leftShoulder`, `rightShoulder`, `SHOULDER_JOINT`는 v3 active 값이 아니다.
- `chest`는 adapter에서 별도 3분할 enum으로 확장하지 않고 `chest`로 보존한다.
- visible UX는 `추천 -> 수정 -> 실행`이다.
- `finalize`는 별도 화면이 아니라 hidden write event다.
- Java backend가 public API owner다.
- Python AI는 raw generation engine이다.

## Active Slug Whitelist

아래 값만 active muscle/pain/DOMS slug로 사용한다.

`trapezius`, `upper-back`, `lower-back`, `chest`, `biceps`, `triceps`, `forearm`, `back-deltoids`, `front-deltoids`, `abs`, `obliques`, `adductor`, `abductors`, `hamstring`, `quadriceps`, `calves`, `gluteal`, `head`, `neck`, `knees`, `left-soleus`, `right-soleus`

상세 기준은 `/mnt/d/project-fit-core/docs/contracts/muscle-slug-whitelist-v3-2026-05-19.md`를 따른다.

## 파일 목록

| 파일 | 용도 |
|---|---|
| `generate.request.golden.json` | `POST /api/routines/generate` 요청 기준 |
| `generate.response.success.golden.json` | generate 성공 응답 기준 |
| `generate.response.fallback.golden.json` | generate fallback 응답 기준 |
| `generate.response.failed.empty-candidate.golden.json` | 후보 없음 failed 응답 기준 |
| `ai-adapter.request.golden.json` | BE -> AI adapter 요청 기준 |
| `draft-update.request.golden.json` | `PATCH /api/routines/drafts/{routineDraftId}` 후보 요청 기준 |
| `finalize.request.golden.json` | hidden finalize 요청 기준 |
| `finalize.response.golden.json` | hidden finalize 응답 기준 |
| `workout-save.request.golden.json` | `POST /api/workouts` 요청 기준 |
| `workout-save.response.golden.json` | workout 저장 응답 기준 |
| `contract-checklist.md` | FE/BE/AI 정합성 체크리스트 |
| `render-ready-checklist.md` | Frontend+AI render-ready 검수 체크리스트 |

## 운영 규칙

- 개발자에게 전달할 active fixture는 이 폴더 또는 versioned pack `golden-api-fixture-pack-v3.0-2026-05-19`를 기준으로 한다.
- 이전 v2/v2.1 pack은 삭제하지 않는다. v2.x와 v3 차이는 contract decision log에서 추적한다.
- golden 변경 시 기존 파일을 조용히 덮어쓰지 말고 새 버전 폴더를 만들고 변경 이유를 기록한다.
