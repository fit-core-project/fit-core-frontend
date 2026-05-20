# Render-ready Checklist

작성일: 2026-04-29  
대상: Frontend+AI, Backend  
목적: Backend 응답이 FE draft/edit/player 흐름에 바로 붙을 수 있는지 빠르게 판정한다.

## 1. Generate Response Top-level

`POST /api/routines/generate` 응답은 아래 top-level key를 가진다.

- `routineDraftId`
- `generationStatus`
- `statusReasonCode`
- `isFallback`
- `summaryTitle`
- `rationaleSummary`
- `routineBlocks`
- `warnings`

주의:

- persistence envelope만 반환하면 render-ready가 아니다.
- `data.routineDraft` 같은 wrapper를 두려면 FE와 명시 합의가 필요하다.
- `routineDraftId`는 generate 시점에 반드시 생성되어야 한다.

## 2. Generate Status Rules

| 상태 | 필수 규칙 |
|---|---|
| `success` | `isFallback=false`, `statusReasonCode=none`, `routineBlocks.length > 0` |
| `fallback` | `isFallback=true`, 사용 가능한 `routineBlocks.length > 0` |
| `failed` | 사용 가능한 루틴이 없으며, `statusReasonCode`가 `none`이 아니어야 함 |

## 3. Routine Block

각 `routineBlocks[]` 항목은 최소 아래를 가진다.

- `order`
- `exerciseName`
- `defaultRestSec` 또는 각 `prescription[].targetRestSec`
- `prescription`
- `exerciseRationale`
- `substitutionCandidates`

MVP에서 optional 가능:

- `exerciseId`
- `movementPattern`
- `primaryMuscles`
- `equipmentType`

## 4. Prescription

각 `prescription[]` 항목은 최소 아래를 가진다.

- `setIndex`
- `setType`
- `targetReps`
- `targetRestSec`

중량 규칙:

- weighted 운동은 `targetWeightKg`를 둔다.
- bodyweight 운동은 `targetWeightKg=null` 또는 생략을 허용할 수 있다.
- canonical 저장 단위는 `kg`다.

## 5. Draft Update

`PATCH /api/routines/drafts/{routineDraftId}` 후보 요청은 FE가 수정한 `routineBlocks`를 서버 draft snapshot에 반영하기 위한 것이다.

검수 질문:

- set 추가/삭제가 반영되는가?
- 운동 교체가 반영되는가?
- kg/reps/rest 변경이 반영되는가?
- hidden finalize가 수정된 draft를 읽는가?

## 6. Finalize

`POST /api/routines/drafts/{routineDraftId}/finalize`는 visible 화면이 아니다.

검수 질문:

- `운동 시작` trigger 직전에 호출되는가?
- 성공 시 `routineFinalId`가 생기는가?
- player/workout save가 `routineFinalId`를 이어받는가?

## 7. Workout Save

`POST /api/workouts` 요청은 아래 linkage를 잃으면 안 된다.

- `sourceRoutineFinalId`
- `timeAvailableMin`
- `durationMin`
- `readinessLevel`
- `currentPainAreas`
- `currentDoms`

주의:

- 기존 mock에 `doms`가 남아 있으면 transitional alias로 보고 diff를 남긴다.
- canonical public field는 `currentDoms`로 맞춘다.

## 8. FE/AI Sign-off Format

```text
FE/AI sign-off:
- 붙는 endpoint:
- 사용한 golden file:
- render-ready: yes/no
- key diff:
- nullable/default diff:
- 다음 blocker:
```

