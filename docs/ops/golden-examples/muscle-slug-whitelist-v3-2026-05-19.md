# Fit-Core Muscle Slug Whitelist v3

작성일: 2026-05-19  
상태: active

## 결정

Fit-Core MVP 루틴 생성 흐름의 muscle / pain / DOMS 부위 값은 FE 라이브러리 기준 slug를 public request, BE adapter, AI 후보 조회, `exercise_tier.pain_triggers`까지 직렬로 사용한다.

## Active Slugs

아래 값만 active slug로 사용한다.

| Slug | 비고 |
|---|---|
| `trapezius` | 승모근 |
| `upper-back` | 등 상부 |
| `lower-back` | 허리/등 하부 |
| `chest` | 가슴 |
| `biceps` | 이두 |
| `triceps` | 삼두 |
| `forearm` | 전완 |
| `back-deltoids` | 후면 삼각근 |
| `front-deltoids` | 전면 삼각근 |
| `abs` | 복근 |
| `obliques` | 복사근/옆구리 |
| `adductor` | 내전근 |
| `abductors` | 외전근 |
| `hamstring` | 햄스트링 |
| `quadriceps` | 대퇴사두 |
| `calves` | 종아리 |
| `gluteal` | 둔근 |
| `head` | 머리 |
| `neck` | 목 |
| `knees` | 무릎 |
| `left-soleus` | 왼쪽 가자미근 |
| `right-soleus` | 오른쪽 가자미근 |

## Superseded Values

아래 값은 v3 active contract에서 새로 쓰지 않는다.

- `leftShoulder`
- `rightShoulder`
- `shoulder` as public pain value
- `SHOULDER_JOINT`
- `CHEST_UPPER`
- `CHEST_MID`
- `CHEST_LOWER`
- `CHEST_MID_LOWER`
- `ARM_TRICEPS`
- `ARM_BICEPS`
- `BACK_LATS`
- 기타 대문자 DB enum style muscle code

## Adapter Rule

- FE가 선택한 값을 public payload에 그대로 둔다.
- BE는 public `currentPainAreas`를 AI `painAreas[].bodyPart`로 전달할 때 값을 임의로 대문자 enum으로 바꾸지 않는다.
- BE는 public `currentDoms[]`를 AI `domsData`로 변환할 때 위 whitelist slug만 사용한다.
- AI는 `exercise_tier.primary_muscle`과 `exercise_tier.pain_triggers`를 위 whitelist slug와 같은 계열로 관리한다.

## 변경 이유

- FE, BE, AI, `exercise_tier.xlsx`를 하나의 slug 체계로 통일해 반복 매핑 오류를 줄인다.
- `leftShoulder -> SHOULDER_JOINT` 같은 중간 변환이 실제 DB/AI 후보 필터와 어긋나는 문제를 제거한다.
- Golden JSON, 화면 선택값, DB 후보 조회값을 같은 어휘로 맞춘다.
