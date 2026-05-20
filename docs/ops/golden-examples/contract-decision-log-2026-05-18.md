# Fit-Core Contract Decision Log

작성일: 2026-05-18
상태: active

## 운영 원칙

계약 변경은 기존 파일을 조용히 덮어쓰지 않는다.

변경 시 아래를 남긴다.

- 날짜
- 변경 전
- 변경 후
- 변경 이유
- 영향 범위
- 검증 결과
- superseded 문서/fixture

## 2026-05-18. Chest muscle enum 3분할 확정

변경 전:

- 일부 문서와 root golden fixture가 `CHEST_MID_LOWER`를 사용했다.
- 이는 중부/하부 가슴을 하나로 묶는 임시 보정처럼 동작했다.

변경 후:

- active DB muscle enum은 `CHEST_UPPER`, `CHEST_MID`, `CHEST_LOWER` 3분할로 본다.
- `chest` UI slug는 adapter에서 세 값으로 확장한다.
- `CHEST_MID_LOWER`는 active 계약에서 사용하지 않는다.

변경 이유:

- AI `exercise_tier.xlsx`와 최신 AI `DB_MUSCLE_ENUMS`가 21개 muscle enum을 SSOT로 정의한다.
- Frontend/AI 개발자가 실제 운동 카탈로그와 DB 후보 조회 흐름을 함께 확인한 결과, incline/mid/decline chest 분리가 제품/운동 추천 UX에 더 맞다고 판단했다.
- Backend 최신 커밋도 `DB_MUSCLE_ENUMS`, DOMS mapping, fallback response를 3분할 기준으로 맞췄다.

영향 범위:

- `/docs/ops/golden-examples`
- `/docs/ops/golden-api-fixture-pack-v2.1-2026-05-18`
- `/docs/contracts/muscle-selection-normalization-v1-2026-04-18.md`
- `/docs/contracts/muscle-selection-normalization-v1-2026-04-18.json`
- FE local golden fixture
- BE `RoutineService` muscle mapping
- AI `routine_engine.py`, `exercise_tier.xlsx`, prompt/evaluator tests

검증 결과:

- FE `npm run build` 통과.
- BE `./gradlew test` 통과.
- AI `.venv/bin/python -m pytest -q -s` 통과, `76 passed`.
- root `/docs/ops/golden-examples`와 FE local golden JSON 동기화 확인.

Superseded:

- `/docs/ops/golden-api-fixture-pack-v2-2026-05-14` 중 `CHEST_MID_LOWER`가 포함된 fixture.
- `/docs/ops/golden-examples-archive/2026-05-18-before-chest-3split`.

주의:

- superseded 문서는 삭제하지 않는다.
- 개발자에게 전달할 때는 반드시 active index 또는 v2.1 pack을 함께 지정한다.

## 2026-05-19. Pain area payload는 유지, AI 내부 pain trigger 정규화 필요

변경 전:

- public golden request는 `currentPainAreas: ["leftShoulder"]`를 사용한다.
- BE -> AI adapter golden도 `painAreas[].bodyPart: "leftShoulder"`를 전달한다.
- AI `routine_engine.py`는 이 값을 그대로 `exercise_tier.pain_triggers LIKE/NOT LIKE` 비교에 사용했다.

확인한 문제:

- `exercise_tier.xlsx`의 `pain_triggers`는 `SHOULDER_JOINT`, `WRIST`, `LOWER_BACK` 같은 DB pain trigger token 기준이다.
- 따라서 `leftShoulder`를 그대로 비교하면 `SHOULDER_JOINT`와 매칭되지 않는다.

결정:

- public `currentPainAreas`는 UI-friendly 값으로 유지한다.
- active golden JSON의 `leftShoulder`도 유지한다. 이 값은 regression case 역할을 한다.
- AI는 후보 조회 SQL과 후검증 전에 `painAreas[].bodyPart`를 DB pain trigger token으로 정규화해야 한다.

예:

- `leftShoulder` / `rightShoulder` / `shoulder` -> `SHOULDER_JOINT`
- `lowerBack` / `lower-back` -> `LOWER_BACK`
- `wrist` -> `WRIST`
- `elbow` -> `ELBOW`
- `hip` / `hipJoint` -> `HIP_JOINT`
- `neck` -> `NECK`

주의:

- golden JSON payload shape는 이번 결정으로 바꾸지 않는다.
- 만약 향후 BE가 `painTriggerTokens`를 명시적으로 AI에 넘기는 구조로 바꾸면, 그때는 새 golden pack 버전을 발행한다.

## 2026-05-19. Golden v3: FE library slug 직렬 연결로 muscle/pain 계약 변경

변경 전:

- v2.1 결정은 가슴 muscle enum을 `CHEST_UPPER`, `CHEST_MID`, `CHEST_LOWER` 3분할로 보았다.
- public pain 예시는 `currentPainAreas: ["leftShoulder"]`를 유지하고, 내부에서 `SHOULDER_JOINT` 같은 DB pain trigger token으로 정규화하는 방식을 검토했다.
- root `/docs/ops/golden-examples`와 FE-local golden fixture가 서로 다른 값을 가질 수 있었다.

변경 후:

- active muscle / pain / DOMS 값은 FE 라이브러리 기준 slug를 public request, BE adapter, AI 후보 조회, `exercise_tier.pain_triggers`까지 직렬로 사용한다.
- active whitelist는 `/docs/contracts/muscle-slug-whitelist-v3-2026-05-19.md`와 `.json`을 따른다.
- active golden pack은 `/docs/ops/golden-api-fixture-pack-v3.0-2026-05-19`를 따른다.
- root `/docs/ops/golden-examples`는 v3.0 active copy다.
- `leftShoulder`, `rightShoulder`, `SHOULDER_JOINT`, `CHEST_UPPER`, `CHEST_MID`, `CHEST_LOWER`는 active contract에서 새로 쓰지 않는다.

변경 이유:

- FE/BE/AI 개발자가 최신 코드에서 FE 라이브러리 slug를 DB/AI까지 동일하게 연결하는 방식으로 정리했다.
- `exercise_tier.xlsx`의 `primary_muscle`과 `pain_triggers`가 `chest`, `front-deltoids`, `upper-back` 같은 slug 기준으로 정렬됐다.
- 중간 변환이 많을수록 반복 수정과 문서/코드 충돌이 발생했기 때문에, 하나의 부위 어휘를 active SSOT로 고정한다.

영향 범위:

- `/docs/ops/golden-examples`
- `/docs/ops/golden-api-fixture-pack-v3.0-2026-05-19`
- `/docs/contracts/muscle-slug-whitelist-v3-2026-05-19.md`
- `/docs/contracts/muscle-slug-whitelist-v3-2026-05-19.json`
- FE local golden fixture
- BE `RoutineService` adapter mapping
- AI `routine_engine.py`, `exercise_tier.xlsx`, prompt/evaluator tests

검증 결과:

- FE `npm run build` 통과.
- BE `bash ./gradlew test` 통과.
- AI `.venv/bin/python -m pytest -q -s` 통과, `88 passed`.
- `exercise_tier.xlsx`에는 `leftShoulder`, `rightShoulder`, `SHOULDER_JOINT`가 없고, `front-deltoids`, `back-deltoids`, `trapezius` 등 whitelist slug가 존재함을 확인했다.

Superseded:

- `/docs/ops/golden-api-fixture-pack-v2.1-2026-05-18`
- `/docs/ops/golden-examples-archive/2026-05-19-before-library-slug-v3`
- 본 문서의 2026-05-18 가슴 3분할 결정 중 active 값 부분
- 본 문서의 2026-05-19 pain trigger 내부 정규화 결정 중 `leftShoulder -> SHOULDER_JOINT` active 유지 부분

주의:

- superseded 결정은 삭제하지 않는다. 변경 이력으로만 보존한다.
- 앞으로 개발자에게 전달할 때는 v3.0 pack 또는 root `/docs/ops/golden-examples`만 active 기준으로 지정한다.
