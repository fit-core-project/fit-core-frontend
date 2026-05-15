# Golden API Fixture Pack v2 동기화 작업 계획

작성일: 2026-05-14  
기준: `golden-api-fixture-pack-v2-2026-05-14` (SSOT)

---

## 배경

기획자가 `golden-api-fixture-pack-v2-2026-05-14` 폴더를 새 SSOT로 지정했다.  
기존 `frontend-ai-notion-delivery-pack-2026-04-30-v2`, frontend-local golden 파일,
오래된 Notion 문서보다 이 팩이 우선한다.

---

## 이슈 목록 및 원인 분석

### 이슈 1 — FE 빌드 실패 (`setType` 누락)

**파일**: `app/routine/draft/page.tsx`  
**원인**: `addSet` 함수의 else 분기에서 `SetPrescription` 객체를 직접 생성할 때 `setType` 필드를 누락했다. `last` 세트가 있으면 spread로 `setType`이 복사되지만, 처음 세트를 추가할 때(else 분기)는 `setType`이 없어 TypeScript 빌드가 실패한다.

```typescript
// 문제 코드 — setType 없음
: {
    setIndex: block.prescription.length,
    targetReps: 10,
    targetWeightKg: null,
    targetRir: 2,
    targetRestSec: 60,
}
```

**수정**: else 분기에 `setType: "working"` 추가.

---

### 이슈 2 — FE 로컬 golden 파일이 구버전

**파일**: `docs/ops/golden-examples/` 하위 4개 파일  
**원인**: v2 팩이 발행되었지만 로컬 복사본이 갱신되지 않았다. 구버전 파일에는 다음이 누락되어 있다.

| 필드 | 구버전 상태 |
|------|-------------|
| `routineBlocks[].order` | 없음 |
| `routineBlocks[].movementPattern` | 없음 |
| `routineBlocks[].primaryMuscles` | 없음 |
| `routineBlocks[].equipmentType` | 없음 |
| `routineBlocks[].defaultRestSec` | 없음 |
| `prescription[].setType` | 없음 |
| `workout-save.response`의 `currentDoms` | `{}` (빈 파일) |
| `finalize.response`의 전체 shape | `routineFinalId`만 존재 |

**수정**: 4개 파일을 v2 팩 내용으로 교체.  
구 delivery-pack 파일은 건드리지 않는다.

---

### 이슈 3 — `llmError` statusReasonCode

**원인**: v2 README에서 `llmError` 사용 금지를 선언했다.  
**현황**: 코드베이스 grep 결과 FE/BE/AI 어디에도 `llmError` 사용 없음.  
**수정**: 불필요. 확인으로 종료.

---

### 이슈 4 — `targetSplitLabel` / `readinessLevel` 미전송

**파일**: `utils/requestAssembler.ts`, `app/ai_routine/generator/page.tsx`  
**원인**:

1. `RoutineFormState`와 `RoutineGenerateRequest` 인터페이스에 두 필드가 없다.
2. `handlePresetClick`이 preset(PUSH/PULL/LEGS/CORE) 선택 시 `targetSplitLabel`을 `formData`에 저장하지 않는다.
3. `handleResetClick`이 리셋 시 `targetSplitLabel`을 초기화하지 않는다.
4. `assembleRoutineRequest`가 두 필드를 요청 객체에 포함하지 않는다.

**contract 요건**:
- preset 선택 시 → `targetSplitLabel: "push"` (소문자)
- preset 리셋 시 → `targetSplitLabel` 키 자체를 요청에서 생략 (axios는 undefined를 직렬화하지 않음)
- `readinessLevel` 기본값 `"normal"`, 항상 전송

**수정**:
- 두 인터페이스에 필드 추가
- `handlePresetClick`에 `targetSplitLabel: groupKey.toLowerCase()` 설정
- `handleResetClick`에 `targetSplitLabel: undefined` 초기화
- `assembleRoutineRequest`에 두 필드 포함 (`targetSplitLabel`은 undefined면 키 생략)

---

### 이슈 5 — BE WorkoutSessionResponse `doms` → `currentDoms`

**파일**: `fit-core-backend/.../WorkoutSessionResponse.java`  
**원인**: v2 golden 기준 workout save 응답 필드명이 `currentDoms`인데, DTO는 `doms`로 선언되어 있다.

**범위 주의**:
- DB 컬럼: `doms` — 변경 없음
- 엔티티 필드: `doms` — 변경 없음
- **Response DTO 필드명만** `currentDoms`로 변경

FE에서 workout API 응답의 `doms` 필드를 직접 읽는 코드가 없음을 grep으로 확인했다.  
(`mockDataFactory.ts`의 `doms`와 `AnatomyModel`의 `mode: "doms"`는 UI 내부 값으로 API 응답과 무관.)

**수정**:
```java
// 변경 전
private List<Doms> doms;
.doms(entity.getDoms())

// 변경 후
private List<Doms> currentDoms;
.currentDoms(entity.getDoms())
```

---

### 이슈 6 — FE API Client `id` fallback 제거

**파일**: `lib/api/routine/routineApiClient.ts`  
**원인**: finalize 응답 타입에 `id?` 레거시 fallback이 남아 있다. v2 계약에서 finalize 응답 키는 `routineFinalId`만 유효하다.

```typescript
// 구버전 — id 레거시 fallback
const result = await AxiosController.post<{ routineFinalId?: string; id?: string }>()
const finalId = result.routineFinalId ?? result.id ?? null
```

**수정**: `id?` 타입 제거, `?? result.id` 제거.

---

### 이슈 7 — AI 테스트 `TestFallbackEmptyCandidates` 단언 오류

**파일**: `fit-core-ai/tests/test_fallback.py`  
**원인**: 후보 없을 때 엔진(`routine_engine.py`)은 이미 올바르게 `generation_status="failed"`, `status_reason_code="emptyCandidate"`, `is_fallback=False`를 반환한다. 그런데 테스트가 `"fallback"` / `is_fallback=True`를 단언해 실패한다.

**엔진 코드는 건드리지 않는다.** 테스트만 수정.

```python
# 구버전 — 틀린 단언
assert result.is_fallback is True
assert result.generation_status == "fallback"

# 수정 후 — 올바른 단언
assert result.generation_status == "failed"
assert result.status_reason_code == "emptyCandidate"
assert result.is_fallback is False
```

---

### 이슈 8 — BE `domsData` 키 매핑 오류 (근육명 → DB enum 키 변환 누락)

**파일**: `fit-core-backend/.../RoutineService.java` (`convertDomsToMap` 메서드)  
**원인**: FE는 UI 근육명(`"chest"`, `"lats"`)으로 `currentDoms`를 전송한다. `convertDomsToMap`이 `Doms::getBodyPart`를 그대로 키로 사용하므로 AI에는 `{ "chest": 2, "lats": 1 }`이 전달된다. 하지만 contract-checklist와 `ai-adapter.request.golden.json`은 DB muscle enum 키(`"CHEST_UPPER"`, `"CHEST_MID"`, `"BACK_LATS"`)를 요구한다.

**현재 코드 동작**:
```
FE currentDoms: [{ bodyPart: "chest", level: "moderate" }]
↓ convertDomsToMap
AI domsData: { "chest": 2 }  ← 틀림

기대값:
AI domsData: { "CHEST_UPPER": 2, "CHEST_MID": 2, "CHEST_LOWER": 2 }
```

**수정**: `convertDomsToMap`에서 UI 근육명을 DB muscle enum 키로 변환하는 매핑 테이블 추가.  
UI 근육명 1개가 여러 DB enum 키로 확장될 수 있다 (예: `"chest"` → `CHEST_UPPER`, `CHEST_MID`, `CHEST_LOWER`).

---

### 이슈 9 — FE `guardGenerateResponse`가 `failed` 응답을 런타임 에러로 처리

**파일**: `utils/responseGuard.ts`  
**원인**: 현재 guard에 `routineBlocks.length > 0` 단언이 있다.

```typescript
assert(
    (d.routineBlocks as unknown[]).length > 0,
    "routineBlocks array is empty"
)
```

`generationStatus: "failed"` + `routineBlocks: []`인 유효한 응답이 오면 이 단언이 실패해 에러가 던져진다. `generator/page.tsx`의 catch 블록이 `setStatus("retryableFailed")`를 설정하여 사용자에게 "연결 오류 — 재시도" 화면을 보여주는데, 실제 상황은 운동 조건(근육/장비)을 바꿔야 한다는 안내가 필요한 상황이다.

**수정**: `generationStatus === "failed"`인 경우 빈 `routineBlocks`를 허용하도록 guard 수정.

```typescript
// 수정 후
if (d.generationStatus !== "failed") {
    assert(
        (d.routineBlocks as unknown[]).length > 0,
        "routineBlocks array is empty"
    )
}
```

---

### 이슈 10 — FE `generator/page.tsx`의 `failed` 상태 미처리

**파일**: `app/ai_routine/generator/page.tsx` (`handleSubmit`)  
**원인**: `isFallback` 플래그만으로 상태를 분기한다.

```typescript
setStatus(routineDraft.isFallback ? "fallback" : "success")
```

`generationStatus: "failed"` + `isFallback: false` 응답이 오면 `"success"` 상태로 처리되어 빈 draft 페이지로 이동하게 된다. (이슈 9가 먼저 수정되어 guard를 통과한 경우.)

`types/state.ts`에 `"hardFailed"` 상태가 이미 존재하므로 이를 활용한다.

**수정**:
```typescript
// 수정 후
if (routineDraft.generationStatus === "failed") {
    setStatus("hardFailed")
} else {
    setStatus(routineDraft.isFallback ? "fallback" : "success")
}
```

추가로 `generator/page.tsx`에 `hardFailed` 상태에 대한 UI를 추가해야 한다.  
메시지: `"운동 부위 또는 장비 조건을 변경한 뒤 다시 생성해 주세요."` (golden `warnings` 기준)

---

## 작업 순서

빌드 가능 상태를 최우선으로 유지하면서 진행한다.

| 순서 | 분류 | 파일 | 이슈 |
|------|------|------|------|
| 1 | **FE — 긴급** | `app/routine/draft/page.tsx` | 이슈 1: `setType: "working"` 추가 |
| 2 | **검증** | — | `npm run build` 통과 확인 |
| 3 | **BE** | `WorkoutSessionResponse.java` | 이슈 5: `doms` → `currentDoms` |
| 4 | **BE** | `RoutineService.java` | 이슈 8: `domsData` 근육명 → DB enum 키 변환 |
| 5 | **FE** | `utils/requestAssembler.ts` | 이슈 4: `targetSplitLabel?`, `readinessLevel` 추가 |
| 6 | **FE** | `app/ai_routine/generator/page.tsx` | 이슈 4, 10: preset/reset 핸들러, `failed` 상태 처리 |
| 7 | **FE** | `utils/responseGuard.ts` | 이슈 9: `failed` 응답 guard 통과 허용 |
| 8 | **FE** | `lib/api/routine/routineApiClient.ts` | 이슈 6: `id?` fallback 제거 |
| 9 | **FE** | `docs/ops/golden-examples/*.golden.json` | 이슈 2: 4개 파일 v2로 교체 |
| 10 | **AI** | `tests/test_fallback.py` | 이슈 7: `TestFallbackEmptyCandidates` 단언 수정 |

---

## 변경 범위에서 제외되는 것

- `golden-api-fixture-pack-v2-2026-05-14/` 폴더 — 읽기 전용 SSOT
- 구 `frontend-ai-notion-delivery-pack-2026-04-30-v2` — v2가 supersede하므로 건드리지 않음
- DB 컬럼 및 엔티티 필드 `doms` — DTO rename과 무관
- `routine_engine.py` 엔진 코드 — 이미 올바름, 테스트만 수정
