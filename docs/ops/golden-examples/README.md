# Golden API Fixture Pack v3.0

작성일: 2026-05-18
상태: active

## 목적

이 폴더는 Fit-Core MVP 루틴 생성/수정/확정/운동 저장 흐름의 active golden JSON 묶음이다.

## v3.0 변경점

- `fit-core-ai/scripts/exercise_tier.xlsx`의 `primary_muscle` 값을 FE-facing spreadsheet slug SSOT로 고정한다.
- legacy enum 값(`CHEST_MID`, `ARM_TRICEPS`, `LEG_QUADS` 등)은 active contract에서 사용하지 않는다.
- `chest` UI slug는 adapter에서 별도 3분할 enum으로 확장하지 않고 `chest`로 보존한다.

## 운영 규칙

- 개발자에게 전달할 active fixture는 이 폴더 또는 `/docs/ops/golden-examples`를 기준으로 한다.
- 이전 v2/v2.1 pack은 삭제하지 않는다. v2.x와 v3 차이는 contract decision log에서 추적한다.
- golden 변경 시 기존 파일을 조용히 덮어쓰지 말고 새 버전 폴더를 만들고 변경 이유를 기록한다.
