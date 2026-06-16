# QuickLog 저장 연동 지점 분석

> 목적: `app/ai_quicklog/page.tsx`의 가짜 setTimeout 저장을 실제 BE API에 연결할 때 필요한 모든 연동 지점 식별  
> 분석 기준: 코드 근거(파일:라인) 기반. 추측 없음.

---

## 1. QuickLog parsedData 구조

### 타입 정의
`app/ai_quicklog/page.tsx:9-15`

```typescript
interface ParsedData {
    diet_logs: {
        food_name: string
        estimated_calories: number
        protein_g: number
        carbs_g: number
        fat_g: number
    }[]
    workout_logs: {
        exercise_name: string   // 자연어 운동명 ("벤치프레스", "스쿼트")
        weight_kg: number | null
        sets: number | null     // 세트 수 (행 수, 반복 단위 아님)
        reps: number | null
    }[]
    overall_summary: string
    status?: "success" | "fallback"
    fallback_reason?: string
}
```

### AI 파싱 방식
`app/ai_quicklog/page.tsx:100-142`  
`AxiosController.post("/api/ai/parse-log", { text })` 호출 → AI 서버가 JSON으로 반환  
파싱 결과를 `setParsedData(data.result)` 형태로 상태에 저장

### 가짜 저장 위치
`app/ai_quicklog/page.tsx:144-157`

```typescript
const handleSaveLog = () => {
    setIsSaving(true)
    setTimeout(() => {          // ← 실제 API 호출 없음, 800ms 지연만
        setIsSaving(false)
        setSaveSuccess(true)
        ...
    }, 800)
}
```

---

## 2. BE 엔드포인트 후보

### 운동 기록 저장 API

**엔드포인트**: `POST /api/workouts`  
**컨트롤러**: `WorkoutSessionController.java:49-52`

**WorkoutSessionRequest** (`WorkoutSessionRequest.java`)

| 필드 | 타입 | 제약 | 기본값 |
|------|------|------|--------|
| workoutDate | LocalDate | @NotNull | - |
| splitLabel | String | - | - |
| sourceRoutineFinalId | String | - | - |
| timeAvailableMin | Short | - | - |
| durationMin | Short | - | - |
| readinessLevel | String | - | "normal" |
| currentPainAreas | List\<String\> | - | - |
| currentDoms | List\<Doms\> | - | - |
| unavailableEquipment | List\<String\> | - | - |
| **sets** | List\<WorkoutSetRequest\> | @NotEmpty @Valid | - |

**WorkoutSetRequest** (`WorkoutSetRequest.java`)

| 필드 | 타입 | 제약 |
|------|------|------|
| exerciseOrder | Integer | @NotNull @Min(1) |
| **exerciseId** | String | **@NotBlank** |
| **exerciseNameSnapshot** | String | **@NotBlank** |
| setIndex | Integer | @NotNull @Min(1) |
| setType | String | 기본값 "working" |
| trackingMode | String | 기본값 "weightReps" |
| weightKg | BigDecimal | 0 < x ≤ 500 (nullable) |
| **reps** | Integer | **@NotNull** 1 ≤ x ≤ 50 |
| rpe | BigDecimal | nullable |
| rir | BigDecimal | nullable |
| isFailure | Boolean | 기본값 false |
| restSec | Integer | 0 ≤ x ≤ 600 (nullable) |
| setNote | String | nullable |

**FE WorkoutSaveRequest** (`lib/api/workout/workoutApiClient.ts:21-32`)  
BE DTO와 동일 구조. `workoutApiClient.save(request)` → isDemoMode() 분기 후 `POST /api/workouts` 호출

### 식단 기록 저장 API

**현황**: **없음**  
BE 전체에 Diet/Meal/Nutrition/Food 관련 Controller, Entity, Repository 없음.  
QuickLog의 `diet_logs` 파싱 결과는 현재 화면 표시 전용이며 저장 대상 엔드포인트가 없다.

---

## 3. parsedData ↔ BE DTO 필드 매핑표

### workout_logs 1건 = WorkoutSetRequest N건 (sets 수만큼 행 분리)

| parsedData 필드 | WorkoutSetRequest 필드 | 처리 방식 | 비고 |
|----------------|----------------------|----------|------|
| exercise_name | exerciseNameSnapshot | 직접 복사 | "벤치프레스" 그대로 |
| exercise_name | **exerciseId** | **변환 필요** | 이름→ID 매칭 (3절 참고) |
| weight_kg | weightKg | number → BigDecimal | null 허용 |
| reps | reps | 직접 복사 | null이면 기본값 필요 (BE @NotNull) |
| sets (수) | setIndex (1…sets) | 행 분리 루프 | sets=3이면 setIndex 1,2,3 생성 |
| - | exerciseOrder | 순서 인덱스 자동 할당 | |
| - | workoutDate | `new Date()` 현재 날짜 | |
| - | splitLabel | "QuickLog" 고정 또는 생략 | |
| - | sourceRoutineFinalId | null | 루틴 기반 아님 |
| - | rpe, rir | QuickLog에 없음 | null 허용 → 생략 가능 |
| - | isFailure | false 고정 | |
| - | restSec | null 또는 0 | |

### 빠진 필드 (BlockerI)

| 필드 | 문제 |
|------|------|
| **exerciseId** | @NotBlank 필수. QuickLog는 자연어 운동명만 제공, ID 없음 |
| **reps** | @NotNull 필수. parsedData.reps가 null이면 BE 검증 실패 |
| weightKg | 0 초과 제약 (weightKg > 0). parsedData.weight_kg가 null이거나 0이면 생략 처리 필요 |

---

## 4. 운동명 → Exercise ID 매칭 방식

### 현재 상태: 매칭 메커니즘 없음

**ExerciseTierRepository** (`ExerciseTierRepository.java:1-10`):

```java
public interface ExerciseTierRepository extends JpaRepository<ExerciseTierEntity, Long> {
    // findByNameKr, findByNameEn 없음
}
```

**JpaRepository 기본 메서드**: `findById(Long)` 만 사용 가능. 이름 검색 불가.

**ExerciseTierEntity 필드** (`ExerciseTierEntity.java:28-29`):
- `nameKr` (TEXT): 한국어 운동명
- `nameEn` (TEXT): 영어 운동명

**ExerciseTierController** (`ExerciseTierController.java:23-27`):
- `GET /api/exercises/catalog` → 전체 목록 반환 (id, nameKr, nameEn 포함)
- `GET /api/exercises/{exerciseId}/recent-record` → 특정 ID 최근 기록

**ExerciseTierResponse** (`ExerciseTierResponse.java`): `id(Long)`, `nameKr`, `nameEn`, `primaryMuscle`, `secondaryMuscle[]`, `equipment`, `tier`

### exerciseId 포맷 주의사항

WorkoutSetRequest.exerciseId는 `String` 타입.  
데모 데이터 참고 (`demoMode.ts:239-241`): `"bench-press"`, `"squat"` — 슬러그 형식  
strengthBaseline 참고 (`demoMode.ts:43-46`): `"75"`, `"30"` — 숫자 문자열 형식  
→ 실제 DB의 `exercise_tier.id`는 Long (자동증가). 슬러그가 별도로 있는지 DB 스키마 확인 필요.

### 미스매치 / 없는 운동 처리

- AI가 반환하는 `exercise_name`이 DB에 없는 운동("집에서 팔굽혀펴기")일 경우 매칭 실패
- 매칭 실패 시 exerciseId를 채울 수 없어 BE @NotBlank 검증 실패
- 현재 FE에 fallback 처리 없음

---

## 5. 저장 후 영향받는 화면

### 같은 `workout_session` 테이블 공유

| 화면 | 사용 API | 동일 테이블 |
|------|----------|-----------|
| `/my` 운동 기록 목록 | `GET /api/workouts/recent` | ✅ QuickLog 저장 즉시 반영 |
| 개인 기록(PR) | `GET /api/workouts/prs` | ✅ 반영 (추정 1RM 자동 계산) |
| 출석률 | `GET /api/workouts/attendance` | ✅ 해당 날짜 출석 카운트 |
| `ai_routine/player` 저장 | `POST /api/workouts` (동일) | ✅ 같은 엔드포인트 |

Player 저장(`lib/api/workout/workoutApiClient.ts:76`)과 QuickLog 저장이 완전히 동일한 API를 공유.  
테이블 충돌 없음. 날짜가 같으면 두 세션 모두 기록됨(중복 아님, 별도 세션).

### Demo 모드 분기

`workoutApiClient.ts:37-74`: `isDemoMode()` 체크 → `fitcore_demo_workouts` localStorage에 저장  
QuickLog의 `handleSaveLog`는 `workoutApiClient.save()`를 호출하지 않으므로 현재 데모 분기도 미적용 상태.

---

## 6. 인증 / 유저 귀속 방식

**FE 토큰 주입**: `lib/axios/AxiosController.ts` 인터셉터  
- Zustand `auth-storage` → `state.token` 추출 → `Authorization: Bearer {token}` 헤더 자동 추가

**BE 유저 추출**: `WorkoutSessionService.createWorkoutSession()` 시작에서 `securityUtils.getCurrentUserId()` 호출  
- JWT `sub` (subject) 필드 → userId 매핑 → 해당 user_id로 workout_session 저장

**Demo 사용자**:  
- `createDemoToken()` (`demoMode.ts:388-405`): `sub: "interviewer.demo@fit-core.local"`, `demo: true`
- 이 토큰이 실제 BE로 전송되면 해당 이메일 유저가 없어 401/403 반환 (demo 토큰은 FE 전용)
- `workoutApiClient.save()`의 `isDemoMode()` 분기가 실제 API 호출을 막음
- QuickLog는 이 분기를 거치지 않으므로, 데모 모드에서 실제 저장 시도 시 BE 에러 발생

---

## 7. 빠진 조각 / 리스크

### Critical (연결 불가 수준)

| 항목 | 상세 |
|------|------|
| **exerciseId 매칭 불가** | `WorkoutSetRequest.exerciseId @NotBlank` 필수. 자연어 이름→ID 변환 로직 없음. `ExerciseTierRepository`에 이름 검색 메서드 없음 |
| **reps null 처리** | parsedData.reps가 null일 때 BE `@NotNull` 검증 실패. 기본값 또는 스킵 처리 필요 |
| **식단 저장 엔드포인트 없음** | diet_logs는 파싱 후 화면 표시만. BE에 식단 기록 테이블/API 미존재 |

### High (버그 발생 수준)

| 항목 | 상세 |
|------|------|
| **데모 모드 분기 없음** | 데모 사용자가 저장 시 실제 BE에 demo 토큰 전송 → 에러 발생 |
| **weightKg > 0 제약** | weight_kg=0 또는 null(맨몸운동)이면 BE 검증 실패. null 시 필드 생략 처리 필요 |
| **exerciseId 포맷 불명확** | DB의 exercise_tier.id가 Long인데 WorkoutSetRequest.exerciseId가 String. 슬러그 vs 숫자 문자열 포맷 미확인 |

### Medium

| 항목 | 상세 |
|------|------|
| **없는 운동 처리** | AI가 카탈로그에 없는 운동 반환 시 fallback 없음 |
| **workoutDate 로직** | 저장 시 현재 날짜 기준 — 자정 넘어서 전날 운동 입력 시 날짜 불일치 가능 |

---

## 8. 권장 연결안 (최소 변경) + 대안

### 권장안 A: FE catalog 조회 후 이름 매칭 (최소 BE 변경)

**필요 작업 (FE 전용)**:

1. `GET /api/exercises/catalog` 호출 → `ExerciseTierResponse[]` 수신 (이미 `nameKr`, `nameEn` 포함)
2. `findExerciseIdByName(exerciseName, catalog)`: `nameKr` 또는 `nameEn` 정규화(공백/대소문자) 매칭 → `id` 반환
3. `convertParsedDataToWorkoutRequest(parsedData, catalog)`:
   - workout_logs 배열을 sets[] 형태로 변환 (sets 수만큼 setIndex 행 분리)
   - exerciseId 매칭 실패 시 해당 운동 건너뜀 + 사용자 토스트 경고
   - reps null이면 해당 세트 건너뜀
   - weightKg null이면 해당 필드 생략 (맨몸운동)
4. `handleSaveLog()`에서 `workoutApiClient.save(request)` 호출 (기존 save 함수 재사용 — 데모 분기 포함)

**BE 변경**: 없음  
**신규 파일**: `lib/api/quicklog/quicklogConverter.ts` (변환 유틸)

---

### 대안 B: AI 서버에서 exerciseId 반환 (품질 최선)

`POST /api/ai/parse-log` 응답에 `exercise_id` 필드 추가.  
Python AI 서버에서 exercise 카탈로그를 DB에서 조회한 후 매칭하여 반환.

- **장점**: FE에서 카탈로그 fetch 불필요, 한국어 변형("벤치", "벤치프레스", "bench press") 처리를 AI가 담당
- **단점**: AI 서버 Python 코드 수정 필요 (parsedData 스키마 변경 → FE 타입 수정 동반)
- **적합 시기**: AI 서버 개발 여력이 있을 때. 연동 품질 가장 높음

---

### 대안 C: 매칭 실패 시 사용자 수동 선택 UI (폴백)

운동명 매칭 실패 항목에 대해 FE 모달에서 카탈로그 검색 UI 제공 → 사용자가 직접 선택  
UX 비용 높음. 권장안 A의 보완재로 활용 가능.

---

## 요약

| 구분 | 현황 |
|------|------|
| 재사용 가능 기존 API | `POST /api/workouts` — Player와 동일, `workoutApiClient.save()` 재사용 가능 |
| 신규 BE 엔드포인트 필요 여부 | **운동 기록: 불필요** / **식단 기록: 신규 필요** |
| 가장 큰 블로커 | `exerciseId @NotBlank` — catalog 조회 후 이름 매칭 로직 FE 구현 필요 |
| 운동명 매칭 방식 | 현재 없음. 권장: FE에서 `GET /api/exercises/catalog` 조회 후 nameKr/nameEn 정규화 매칭 |
| 데모 모드 | `workoutApiClient.save()` 재사용 시 자동 처리 (이미 isDemoMode() 분기 내장) |
| 식단 | BE 미구현. 별도 백로그로 분리 필요 |
