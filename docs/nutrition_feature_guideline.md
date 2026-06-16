# 영양·식단 기능 구현 가이드라인

> 목적: 개념 가이드라인을 실제 코드(FE/BE/AI)에 매핑해 실사용 가능한 구현 지도 작성  
> 코드 기준 날짜: 2026-06-16 / 분석 대상: FE(Next.js 16) + BE(Spring Boot) + AI(FastAPI+Ollama)  
> 모든 근거 파일:라인 표기. 추측 항목은 "확인필요" 표시.  
> **MVP 완료**: 2026-06-17 — Phase 0(N0-1~4) + Phase 1(N1-1~10) 전체 구현 완료. 이하 §7 Phase 0/1 테이블은 이력 보존용.

---

## 1. 실제 코드 기준 데이터 모델

### 1-1. 신규 테이블: `diet_log`

**관례 근거**: `WorkoutSessionEntity.java`, `V1__init_schema.sql`

```sql
-- 마이그레이션 파일: V7__add_diet_log.sql (다음 번호: 현재 최신 V6)
-- V3, V5 건너뜀 확인: V1, V2, V4, V6 순 (db/migration/ 디렉토리)
CREATE TABLE IF NOT EXISTS diet_logs (
    id               CHAR(36)      NOT NULL,   -- UUID, WorkoutSessionEntity:42-45 관례
    user_id          CHAR(36)      NOT NULL,   -- FK → user_profiles.user_id
    log_date         DATE          NOT NULL,   -- workout_session의 workout_date 대칭
    meal_type        VARCHAR(20),              -- breakfast / lunch / dinner / snack
    logged_at        DATETIME,                 -- 실제 섭취 시간 (optional)
    food_name        VARCHAR(255)  NOT NULL,
    amount_g         DECIMAL(8,1),             -- 그램화된 양 (unit 정규화 후)
    amount_raw       VARCHAR(50),              -- 원본 입력 ("1그릇", "300ml")
    kcal             INT           NOT NULL,   -- 정수 저장 (아래 kcal 정책 참조)
    protein_g        DECIMAL(6,1),             -- 소수 1자리 (가이드라인: 매크로 소수1자리)
    carbs_g          DECIMAL(6,1),
    fat_g            DECIMAL(6,1),
    source           VARCHAR(20)   NOT NULL,   -- 'db' / 'ai' / 'manual'
    is_deleted       TINYINT(1)    NOT NULL DEFAULT 0,   -- BaseDeleteEntity 관례
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_diet_user_date (user_id, log_date)
);
```

**엔티티 관례**:
- UUID ID + @CreationTimestamp + @UpdateTimestamp (`WorkoutSessionEntity.java:85-91`)
- extends BaseDeleteEntity (소프트딜리트, `UserProfileEntity.java:38`)
- JSON 컬럼 필요 시 `@JdbcTypeCode(SqlTypes.JSON)` 패턴 (`UserProfileEntity.java:129`)

---

### 1-2. 신규 테이블: `nutrition_targets`

```sql
-- 마이그레이션 파일: V8__add_nutrition_targets.sql
CREATE TABLE IF NOT EXISTS nutrition_targets (
    id               CHAR(36)      NOT NULL,
    user_id          CHAR(36)      NOT NULL UNIQUE,   -- 1인 1설정
    kcal_goal        INT,
    protein_g_min    DECIMAL(6,1),
    protein_g_max    DECIMAL(6,1),
    carbs_g_min      DECIMAL(6,1),
    carbs_g_max      DECIMAL(6,1),
    fat_g_min        DECIMAL(6,1),
    fat_g_max        DECIMAL(6,1),
    -- 추가 영양소 상한/하한 (v1.x)
    sodium_mg_max    INT,
    fiber_g_min      DECIMAL(6,1),
    is_deleted       TINYINT(1)    NOT NULL DEFAULT 0,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**미설정 처리**: 모든 목표값 NULL → FE에서 회색 바(가이드라인: 미설정=회색바). NULL 판단은 FE에서만.

---

### 1-4. kcal 계산 정책 (확정)

| source 값 | kcal 결정 방식 | AI estimated_calories 사용 여부 |
|-----------|--------------|-------------------------------|
| `'db'` | DB에서 조회한 per-100g kcal × 양(g) / 100 → 정수 반올림 | **금지** |
| `'ai'` | AI가 반환한 protein_g · carbs_g · fat_g → **4·4·9 공식** 적용 → 정수 반올림 | **금지** (estimated_calories 필드 무시) |
| `'manual'` (매크로 입력) | 사용자가 입력한 protein_g · carbs_g · fat_g → **4·4·9 공식** 적용 → 정수 반올림 | 해당 없음 |
| `'manual'` (kcal 직접 입력) | 사용자가 직접 입력한 kcal 값 그대로 사용 | 해당 없음 |

**kcal 계산 공식**: `round(protein_g * 4 + carbs_g * 4 + fat_g * 9)`  
**저장 책임**: BE `DietLogService`에서 source에 따라 kcal를 재계산 후 저장. FE에서 AI 응답의 `estimated_calories`를 그대로 전달해도 BE에서 무시.  
**근거**: AI `estimated_calories` 필드(`nlp_engine.py:21`)는 LLM 추정값으로 정확도 불보장. 4·4·9 공식이 재현 가능하고 일관성 있는 유일한 기준.

---

### 1-3. 기존 관련 데이터

**체조성 (TDEE 입력 가용)**:
- `user_profiles.body_weight_kg` DECIMAL(5,2) — `V1__init_schema.sql:24`
- `user_profiles.body_fat_pct` DECIMAL(5,2) — `V1__init_schema.sql:25`
- `user_profiles.body_composition_snapshot` TEXT(JSON) — `V1__init_schema.sql:36`
  - `BodyComposition.java`: measuredAt, bodyWeightKg, bodyFatPct, skeletalMuscleMassKg 포함
- **TDEE 계산 필요 데이터 모두 BE에 존재**: 체중(`body_weight_kg`), 성별(`gender`), 생년월일(`birth_date`), 활동량(`training_days_per_week`, `experience_level`) — `UserProfileEntity.java:64,82,85-86`
- **TDEE 계산 공식**: 미정사항 §7 참조

---

## 2. API 설계 (기존 컨트롤러 관례 기반)

### 2-1. 대칭 관례 (`WorkoutSessionController.java:29-65`)

| workout 패턴 | diet 대칭 |
|---|---|
| `POST /api/workouts` | `POST /api/diet-logs` |
| `GET /api/workouts/recent` (페이징) | `GET /api/diet-logs/today` (날짜별) |
| `GET /api/workouts/{id}` | `GET /api/diet-logs/{id}` |
| `GET /api/workouts/attendance` | `GET /api/diet-logs/summary` (일별 매크로 합계) |
| — | `GET /api/diet-logs/range?from=&to=` (달력용, v1.x) |
| `GET /api/workouts/prs` | — (영양 PR 개념 없음) |

### 2-2. nutrition_targets API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/nutrition-targets/me` | 현재 유저 목표 조회 (없으면 204) |
| `PUT /api/nutrition-targets/me` | 목표 저장/수정 (upsert) |

### 2-3. Request/Response DTO 초안

**DietLogRequest** (BE 수신):
```java
// WorkoutSessionRequest.java 패턴 참조 (jakarta.validation 사용)
public class DietLogRequest {
    @NotNull LocalDate logDate;
    String mealType;          // breakfast / lunch / dinner / snack (nullable)
    String loggedAt;          // "HH:mm" 형태 (nullable)
    @NotBlank String foodName;
    BigDecimal amountG;       // 그램화된 양 (nullable, 수동입력 시 null 가능)
    String amountRaw;         // 원본 입력 보존 (nullable)
    @NotNull Integer kcal;
    BigDecimal proteinG;
    BigDecimal carbsG;
    BigDecimal fatG;
    @NotBlank String source;  // 'db' / 'ai' / 'manual'
}
```

**DietLogResponse** (FE 수신):
```java
public class DietLogResponse {
    String id; String userId; LocalDate logDate;
    String mealType; String loggedAt;
    String foodName; BigDecimal amountG; String amountRaw;
    Integer kcal;
    BigDecimal proteinG; BigDecimal carbsG; BigDecimal fatG;
    String source;  // 항목별 출처 표시용
    String createdAt;
}
```

**DietSummaryResponse** (오늘 집계):
```java
public class DietSummaryResponse {
    LocalDate date;
    Integer totalKcal;
    BigDecimal totalProteinG; BigDecimal totalCarbsG; BigDecimal totalFatG;
    List<DietLogResponse> items;  // 시간순 정렬
}
```

---

## 3. FE 구조

### 3-1. 탭바 현황 및 재편 계획

**현재 탭바 위치**: `app/my/page.tsx:18-26`

```typescript
// 현재 (app/my/page.tsx:18-26)
type TabId = "profile" | "stats" | "routine" | "workout" | "settings"
const tabs = [
    { id: "profile", label: "프로필", icon: <User size={18} /> },
    { id: "stats",   label: "통계",   icon: <Trophy size={18} /> },
    { id: "routine", label: "루틴",   icon: <Dumbbell size={18} /> },
    { id: "workout", label: "운동이력", icon: <ClipboardList size={18} /> },
    { id: "settings",label: "설정",   icon: <Settings size={18} /> },
]
```

**재편 목표** (프로필·통계·운동·영양·설정):
```typescript
// 변경 후 (app/my/page.tsx 동일 위치)
type TabId = "profile" | "stats" | "workout" | "nutrition" | "settings"
const tabs = [
    { id: "profile",   label: "프로필", icon: <User /> },
    { id: "stats",     label: "통계",   icon: <Trophy /> },
    { id: "workout",   label: "운동",   icon: <Dumbbell /> },   // 루틴+운동이력 통합
    { id: "nutrition", label: "영양",   icon: <Utensils /> },   // 신규
    { id: "settings",  label: "설정",   icon: <Settings /> },
]
```

**반응형**: `max-w-[480px]` 고정 (`app/my/page.tsx:88`). `grid-cols-5` 유지 (5탭→5탭 동일).  
현재 탭바는 `/my` 페이지 내부 state 기반이며 별도 하단 네비 컴포넌트 없음.

---

### 3-2. 내비 재편 영향 파일 목록

| 파일 | 변경 내용 | 난이도 |
|------|-----------|--------|
| `app/my/page.tsx:18-26` | TabId 타입, tabs 배열, 렌더링 분기 | S |
| `app/my/workout/WorkoutList.tsx` | 변경 없음 (재사용) | — |
| `app/my/routine/Routine.tsx` | 변경 없음 (재사용) | — |
| `app/my/workout/WorkoutTab.tsx` | **신규**: Routine + WorkoutList 통합 컴포넌트 (서브탭 또는 스크롤) | S |
| `app/my/nutrition/` | **신규 디렉토리**: NutritionTab.tsx, DietLogList.tsx, DietLogEntry.tsx | M |
| `app/page.tsx:27-64` | "오늘의 영양" 카드 실데이터 연결 | M |
| `types/project.d.ts` | DietLogResponse, DietSummaryResponse, NutritionTarget 타입 추가 | S |
| `lib/api/diet/dietApiClient.ts` | **신규**: workoutApiClient.ts 패턴 복제 | S |
| `utils/demoMode.ts` | 데모 식단 데이터 + getDemoDietLogs() 추가 | S |

---

### 3-3. 신규 화면 목록

| 화면 | 경로 | 설명 |
|------|------|------|
| 영양 탭 (오늘) | `/my` → nutrition 탭 | 오늘 식단 목록 + 매크로 합계 바 (MVP) |
| 수동 입력 | `/my` → nutrition → 입력 버튼 → 인라인 또는 `/ai_quicklog` 리디렉트 | 수동 입력 모달 또는 신규 페이지 |
| 영양 달력 | `/my` → nutrition 탭 → 달력뷰 (v1.x) | 날짜별 kcal 표시 |
| 하루 상세 | 달력 날짜 클릭 → `/my/nutrition/[date]` (v1.x) | 끼니별 입력 항목 시간순 |

**달력 재사용**: `app/my/stats/AttendanceSection.tsx` — 주별 바 표시만 있고 달력 컴포넌트 없음. 신규 구현 필요.

---

### 3-4. 대시보드 "오늘의 영양" 카드 현황

**위치**: `app/page.tsx:27-64`  
**데이터 출처**: 완전 하드코딩 (1,850/2,500 kcal, 74%, 탄 180g, 단 120/150g, 지 45g)  
API 호출 없음. MVP 단계에서 `GET /api/diet-logs/summary?date={YYYY-MM-DD}` 연결 필요.  
**주의**: 쿼리 파라미터에 리터럴 `"today"` 금지. FE에서 실제 KST 날짜를 `new Date().toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul'})` 또는 동등한 방식으로 계산해 `YYYY-MM-DD` 형식으로 전달. BE는 날짜 문자열만 수신.

---

### 3-5. 프로필 편집 "영양 목표" 섹션 추가 지점

**파일**: `app/my/profile/ProfileEditForm.tsx`

| 섹션 | 위치 | 배경색 |
|------|------|--------|
| Section 1: 계정·기본신체 | line 277-388 | bg-blue-50/50 |
| Section 2: 피트니스 설정 | line 390-481 | bg-slate-50 |
| **→ 신규: 영양 목표** | **line 482 이후 삽입** | bg-amber-50/50 (제안) |
| Section 3: 스트렝스 베이스라인 | line 483-563 | bg-slate-50 |
| Section 4: 부상 관리 | line 565-616 | bg-red-50/30 |

섹션 패턴: `div.bg-[색].rounded-2xl.border.border-[색]-100.p-5.space-y-4` + `flex items-center gap-2` (아이콘+제목)  
저장: 기존 `onSave(Partial<UserResponse>)` 콜백 대신 별도 `PUT /api/nutrition-targets/me` 호출 필요 (nutrition_targets는 별도 테이블).

---

## 4. 음식 RAG 재활용 평가

### 4-1. Supplement RAG 현황

| 항목 | 내용 | 파일 |
|------|------|------|
| 임베딩 모델 | `dragonkue/BGE-m3-ko` (한국어 특화) | `scripts/build_embedding_db.py:555` |
| ChromaDB 저장 경로 | `./data/chroma_db/latest_index` | `build_embedding_db.py:560` |
| 검색 전략 | 하이브리드: Vector(Chroma) + BM25(kiwi 토큰화) + Cross-Encoder 재순위화 | `supplement_engine.py:532-596` |
| 재순위화 모델 | `BAAI/bge-reranker-v2-m3` | `supplement_engine.py:580` |
| 데이터셋 | 의약품/약물/보충제/상호작용 JSON 16개 | `build_embedding_db.py:49-65` |

### 4-2. 음식 RAG 재활용 가능성 평가

**재활용 가능 (코드 레벨)**:
- 임베딩 모델 (`dragonkue/BGE-m3-ko`) — 한국 음식명 임베딩에 적합
- 하이브리드 검색 전략 (Vector+BM25+Cross-Encoder) — 구조 그대로 복제 가능
- ChromaDB 적재 스크립트 패턴 (`build_embedding_db.py`) — 데이터셋만 교체
- `SupplementRAGEngine` 클래스 구조 → `FoodRAGEngine`으로 파생 가능

**재활용 불가 (데이터 레벨)**:
- 현재 ChromaDB 컬렉션은 drug/supplement/interaction 전용
- 음식 영양정보 데이터셋 신규 구축 필요

**내장 폴백 발견**: `nlp_engine.py:44-60`  
`_COMMON_FOOD_NUTRITION_PER_100G` 딕셔너리 (닭가슴살, 쌀밥, 계란 등 10개 음식)가 이미 존재.  
→ MVP에서 RAG 전 로컬 매칭 시도 후, 미스 시 LLM 추정으로 폴백 가능 (RAG 구축 전 임시 활용)

### 4-3. 음식 데이터셋 적재안

**옵션 A: 공공 음식 DB (권장)**
- 식품영양성분 DB (식품의약품안전처 공개 API/CSV) — per-100g 기준, 한국 음식 포함
- ChromaDB에 `food_name`, `kcal_per_100g`, `protein_g`, `carbs_g`, `fat_g`, `serving_desc` 적재
- 검색: 음식명 → 벡터 유사도 → Top-K → LLM이 양 계산

**옵션 B: USDA FoodData Central**
- 영어 데이터 중심. 한국 음식 커버리지 낮음. 보완재로 사용 가능.

**옵션 C: LLM 추정 전용 (MVP 폴백)**
- 데이터셋 없이 LLM이 per-100g 영양정보 직접 추정
- 이미 `nlp_engine.py`의 `estimated_calories/protein_g/carbs_g/fat_g`가 이 방식
- 정확도 낮음, source='ai'로 기록

---

## 5. parse-diet AI 수정 범위

> **확정**: QuickLog는 식단 전용. 운동 단발 로깅(exerciseId 매칭 등) 없음.  
> **확정**: 기존 `POST /api/ai/parse-log`(운동+식단 혼합)는 건드리지 않고, 신규 `POST /api/ai/parse-diet`(식단 전용)를 분리 생성.  
> 분리 이유: parse-log의 WorkoutItem/workout_logs 스키마와 충돌 없이 독립 진화 가능.

### 5-1. 현재 DietItem 스키마 (`engines/quicklog/nlp_engine.py:17-24`)

```python
class DietItem(BaseModel):
    food_name: str
    amount: Optional[float]    # ✅ 이미 있음
    unit: Optional[str]        # ✅ 이미 있음
    estimated_calories: int    # ⚠️ BE/FE에서 사용 금지 (§1-4 kcal 정책). 필드 존재는 유지(하위호환)
    protein_g: int             # ⚠️ int → float 변경 필요 (소수1자리 저장용)
    carbs_g: int               # ⚠️ 동일
    fat_g: int                 # ⚠️ 동일
    # ❌ meal_type 없음 — 신규 parse-diet 스키마에 추가
    # ❌ time_of_day 없음 — 신규 parse-diet 스키마에 추가
```

**FE의 현재 ParsedData 타입** (`app/ai_quicklog/page.tsx:9-15`):  
`protein_g: number, carbs_g: number, fat_g: number` — float 변경 시 TS 영향 없음(number).  
`meal_type`, `time_of_day` 추가 시 인터페이스 확장 필요.  
`estimated_calories` 필드: FE에서 화면 표시에 사용 중인지 확인 후 제거 여부 결정.

### 5-2. 신규 `POST /api/ai/parse-diet` 변경 위치

| 변경 | 파일:위치 | 규모 |
|------|-----------|------|
| 신규 `ParseDietItem` 스키마 (meal_type, time_of_day 포함) | `nlp_engine.py:17-24` 또는 신규 파일 | S |
| protein_g/carbs_g/fat_g → float | 신규 스키마 | S |
| `parse-diet` 전용 엔드포인트 추가 | `main.py` (parse-log 아래) | S |
| LLM 프롬프트에 meal_type/time_of_day 추출 지시 | 신규 엔진 함수 | S |
| 정규식 폴백에 시간/끼니 패턴 추가 | `nlp_engine.py:247-328` | M |
| FE ParsedData 인터페이스 확장 (신규 타입) | `app/ai_quicklog/page.tsx:9-15` | S |

**기존 `parse-log` 엔드포인트**: 변경 없음. workout_logs를 사용하는 기존 흐름 유지.

---

## 6. 데모 처리안

### 6-1. 기존 패턴 (`utils/demoMode.ts`)

```typescript
// 패턴: 저장소 키 상수 → 정적 데이터 → seed/clear/get 함수
const DEMO_WORKOUTS_STORAGE_KEY = "fitcore_demo_workouts"  // demoMode.ts:9
export const demoWorkoutSessions: WorkoutSessionResponse[] = [...]  // line 220
export function getDemoRecentWorkouts(page, size): Page<WorkoutSessionResponse>  // line 454
```

### 6-2. 식단 데모 추가안 (동일 패턴)

`utils/demoMode.ts` 추가 항목:
```typescript
const DEMO_DIETS_STORAGE_KEY = "fitcore_demo_diets"

export const demoDietLogs: DietLogResponse[] = [
    { id, userId, logDate: "2026-06-16", mealType: "breakfast", loggedAt: "08:00",
      foodName: "닭가슴살", amountG: 150, kcal: 248, proteinG: 46.5, carbsG: 0, fatG: 5.4,
      source: "db" },
    // ... 3끼니 × 2-3일
]

export function getDemoDietLogs(date: string): DietLogResponse[]
export function getDemoDietSummary(date: string): DietSummaryResponse
```

`seedDemoSession()`, `clearDemoSession()` 에 키 추가 필요 (`demoMode.ts:407-435`).

### 6-3. dietApiClient 패턴

```typescript
// lib/api/diet/dietApiClient.ts (신규, workoutApiClient.ts:34-95 패턴)
const dietApiClient = {
    save: (req: DietLogRequest): Promise<void> => {
        if (isDemoMode()) {
            // localStorage에 저장
            return Promise.resolve()
        }
        return AxiosController.post("/api/diet-logs", req)
    },
    // FE에서 KST 날짜를 직접 계산 ("today" 리터럴 금지)
    getToday: (kstDate: string): Promise<DietSummaryResponse> =>
        isDemoMode()
            ? Promise.resolve(getDemoDietSummary(kstDate))
            : AxiosController.get(`/api/diet-logs/summary?date=${kstDate}`),
}
```

---

## 7. MVP → v1.x 티켓 분해

### Phase 0: 기반 준비 ✅ 완료

| 티켓 | 대상 파일 | DoD | 규모 | 상태 |
|------|-----------|-----|------|------|
| **N0-1** AI parse-diet 신규 엔드포인트 | `engines/quicklog/diet_parser.py` | `POST /api/ai/parse-diet`. ParseDietItem meal_type/time_of_day/float 매크로. LLM 강제 추정 + `_enrich_macros()` 테이블 보충 | S | ✅ |
| **N0-2** BE 마이그레이션 + 엔티티 | `V7__add_diet_log.sql`, `V8__add_nutrition_targets.sql`, `DietLogEntity.java`, `NutritionTargetEntity.java` | 테이블 생성 완료 | M | ✅ |
| **N0-3** FE 타입 정의 | `types/project.d.ts` | `DietLogRequest/Response`, `DietSummaryResponse`, `NutritionTarget` 추가 | S | ✅ |
| **N0-4** 데모 데이터 추가 | `utils/demoMode.ts` | `demoDietLogs`, `getDemoDietSummary`, `DEMO_NUTRITION_TARGET_STORAGE_KEY`, seed/clear 완료 | S | ✅ |

---

### Phase 1: MVP ✅ 완료

| 티켓 | 대상 파일 | DoD | 규모 | 상태 |
|------|-----------|-----|------|------|
| **N1-1** BE Diet API | `DietLogController/Service/Repository.java` | `POST /api/diet-logs`, `GET /api/diet-logs/summary?date=`, source별 4·4·9 kcal 계산 | M | ✅ |
| **N1-2** FE dietApiClient | `lib/api/diet/dietApiClient.ts` | save, getToday, isDemoMode 분기, 4·4·9 demo 계산 | S | ✅ |
| **N1-3** QuickLog 식단 저장 실연결 | `app/ai_quicklog/page.tsx` | parse-diet → `dietApiClient.save()`. 운동 UI 전면 제거, 식단 전용 | S | ✅ |
| **N1-4** 영양 탭 신규 (오늘) | `app/my/nutrition/NutritionTab.tsx` | 오늘 식단 목록 + 매크로 합계 바 + 목표 대비 mini 바 + 수동 입력 진입 | M | ✅ |
| **N1-5** 탭 재편 | `app/my/MyPageContent.tsx` | routine+workout→workout 통합, nutrition 탭 추가. `useSearchParams` Suspense 분리 | S | ✅ |
| **N1-6** 대시보드 카드 실연결 | `app/components/DietSummaryCard.tsx` | 하드코딩 제거, `dietApiClient.getToday()` + kcal 진행 바 | S | ✅ |
| **N1-7** 수동 입력 모달 | `app/my/nutrition/ManualEntryModal.tsx` | 음식명/매크로/kcal 입력, `source='manual'`, AI 입력 링크 포함 | M | ✅ |
| **N1-8** BE NutritionTarget API | `NutritionTargetController/Service.java` | `GET/PUT /api/nutrition-targets/me`, upsert, min>max 검증 | S | ✅ |
| **N1-9** 프로필 영양 목표 섹션 | `ProfileEditForm.tsx`, `nutritionTargetApiClient.ts` | 탄단지+kcal 목표 입력, GET/PUT 연결, FE min>max 사전 검증 | S | ✅ |
| **N1-10** 진행 바 색상화 | `NutritionTab.tsx`, `DietSummaryCard.tsx` | kcal 단일 임계·단백질 min-focused·탄지 범위 over/under/neutral | S | ✅ |

---

### Phase v1.x — 권장 진행 순서

> MVP 완료 이후 아래 순서로 진행 권장.

**1순위 — 수정/삭제 + 안정화**

| 티켓 | 설명 | 규모 | 비고 |
|------|------|------|------|
| **N2-4a** 항목 수정/삭제 UI | `NutritionTab` 각 항목 스와이프/버튼 → `DELETE /api/diet-logs/{id}`, `PATCH` | M | BE 엔드포인트 신규 |
| **N2-4b** 매크로 미상 graceful 처리 | source='ai' 매크로 모두 null 시 FE 경고 표시 + 저장 차단 대신 안내 (현재 BE 400 → UX 개선) | S | 현재 버그성 UX |
| **N2-4c** Ollama 헬스체크 개선 | `/api/ai/health`가 Lightsail→로컬 도달 불가 문제. 클라이언트 직접 체크 또는 터널 URL 구성 | S | BE-AI 분리 배포 문제 |

**2순위 — 음식 RAG**

| 티켓 | 설명 | 규모 | 의존성 |
|------|------|------|--------|
| **N2-1** 음식 RAG 구축 | `build_food_db.py` 신규, 공공 식품 DB 적재, `FoodRAGEngine` 파생 | L | N0-1 완료 |
| **N2-2** AI 역질문 | parse-diet 응답에 `missing_fields` 추가 → FE 대화형 재질문 UI | M | N0-1 완료 |

**3순위 — 추가 목표 + 사진 입력 v2**

| 티켓 | 설명 | 규모 | 의존성 |
|------|------|------|--------|
| **N2-5** 추가 영양소 목표 | sodium, fiber 등 → `nutrition_targets` 컬럼 확장 (스키마에 이미 예약됨) | S | N1-8 완료 |
| **N3-1** 사진 입력 v2 | 이미지 → 비전 모델(Gemini 2.5 Flash) → ParseDietItem[] → 리뷰 UI → 저장 | L | N2-1, §9-7 런타임 확인 후 |

**4순위 — 달력 + 하루 상세 + 통계**

| 티켓 | 설명 | 규모 | 의존성 |
|------|------|------|--------|
| **N2-3** 달력 뷰 | `NutritionCalendar.tsx` 신규, `GET /api/diet-logs/range?from=&to=` | L | N1-4 완료 |
| **N2-4** 하루 상세 | `app/my/nutrition/[date]/page.tsx` — 끼니별 입력 항목 시간순 | M | N2-3 |
| **N2-6** 통계 추세 | 주별/월별 매크로 추이 차트 | M | N2-3 |

**5순위 — TDEE 자동 목표**

| 티켓 | 설명 | 규모 | 의존성 |
|------|------|------|--------|
| **N2-7** TDEE 자동 계산 | BE: `body_weight_kg` + `gender` + `birth_date` + `training_days` → Mifflin-St Jeor + 활동 계수 → `kcal_goal` 자동 제안 | M | 공식 확정 후 |

---

## 8. 미정사항

| 항목 | 옵션 | 결정 기준 |
|------|------|-----------|
| ~~**exerciseId 포맷** (QuickLog 운동 저장)~~ | ~~obsolete~~ | **QuickLog 식단 전용 확정으로 해당 없음**. 운동 저장 연동은 별도 백로그(`backlog.md P1-1~4`) |
| **TDEE 공식** | A) Harris-Benedict, B) Mifflin-St Jeor, C) 사용자 수동 입력 목표 | Mifflin 권장(더 정확). 활동 계수(sedentary~active) 선택 UI 필요 |
| **음식 데이터셋** | A) 식약처 공공 DB, B) USDA, C) LLM 추정 전용 | MVP=C(추정), v1.x=A 순서 권장 (즉시 시작 가능) |
| **QuickLog 분리** | **확정**: 식단 전용. `POST /api/ai/parse-diet` 신규. 기존 parse-log 유지 | §5 확정 내용 참조 |
| **수동 입력 UI 위치** | A) ai_quicklog 페이지 내 탭, B) 영양 탭 인라인 모달, C) 별도 페이지 | MVP=B(간단), v1.x=C(달력연동) |
| **탭 반응형** | 현재 `max-w-[480px]` 고정. 데스크톱 뷰 없음 | 현재 모바일 전용 유지. 변경 시 `app/my/page.tsx:88` 수정 |
| **gram 단위 변환** | "1그릇", "300ml", "한 개" 등 → g 변환 | MVP: LLM 추정 / v1.x: 단위 변환 테이블 |
| **사진 입력 비전 모델** | A) Gemini 2.5 Flash(클라우드, 비전 지원 확실), B) Ollama vision 모델(로컬, 런타임 확인 필요) | §9 참조. v2 착수 전 런타임 확인 필요 |

---

---

## 9. 사진 입력 비전 타당성 분석

### 9-1. 현재 LLM Provider 구성 (`engines/llm_router.py:79-183`)

| 환경 | provider | 모델 | 비전 입력 지원 |
|------|----------|------|--------------|
| 로컬 (`APP_ENV` ≠ production) | `LLM_PROVIDER=local` → ChatOllama | `LOCAL_LLM_MODEL` 환경변수, 기본값 `gemma4:latest` (`llm_router.py:84`) | **런타임 확인 필요** (아래 참조) |
| 운영 (`APP_ENV=production`) | local 차단 → 자동 Gemini 폴백 (`llm_router.py:86-94`) | `gemini-2.5-flash` (`llm_router.py:182-183`) | **지원 확실** (Gemini 2.5 Flash는 멀티모달) |
| 운영 + opt-in | `ALLOW_LOCAL_LLM_IN_PRODUCTION=true` | 동일 Ollama 모델 | 런타임 확인 필요 |

### 9-2. 기존 이미지/파일 업로드 패턴

`main.py:11`에 이미 `from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile` 임포트됨.  
`main.py:210-224`: `POST /api/ai/stt` 가 `UploadFile` (오디오 .webm)로 파일을 받아 처리.  
→ **이미지 업로드 엔드포인트를 동일 패턴으로 추가 가능** — FastAPI 인프라 변경 없음.

### 9-3. 현재 비전 처리 코드 유무

모든 AI 서버 엔진 파일(`engines/*.py`)에서 `image_url`, `PIL`, `base64` 이미지 처리 코드 없음.  
`get_llm()` 함수(`llm_router.py:145-183`)는 텍스트 프롬프트만 가정. 이미지 페이로드 전달 경로 없음.  
→ **비전 입력 파이프라인 전체가 신규 구현 대상.**

### 9-4. Gemini 2.5 Flash 비전 지원 단서

`llm_router.py:180`: `from langchain_google_genai import ChatGoogleGenerativeAI`  
`llm_router.py:183`: `ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=temperature)`  
`langchain_google_genai`는 Gemini 멀티모달 입력을 `HumanMessage(content=[{"type": "image_url", "image_url": ...}])` 형태로 지원.  
→ 라이브러리 레벨에서 비전 전달 경로가 있으며, 모델(`gemini-2.5-flash`)도 멀티모달 지원.  
→ **Gemini provider 사용 시 코드 추가만으로 비전 가능.**

### 9-5. 로컬 Ollama(gemma4) 비전 지원: 런타임 확인 필요

`LOCAL_LLM_MODEL` 기본값 `gemma4:latest`. Gemma 4B 계열은 이미지 입력 지원 여부가 variant마다 다름.  
`ChatOllama`는 `images` 파라미터로 base64 이미지 전달 가능하지만, 현재 `LocalJsonChatModel.invoke()`(`llm_router.py:115-116`)는 텍스트만 전달.  
→ **로컬 비전 지원 여부는 Ollama에서 실행 중인 gemma4 variant와 VRAM 여유 확인 필요.**

### 9-6. 사진 입력 파이프라인 삽입 지점

```
[FE] <input type="file" accept="image/*" capture="environment">
  → (app/ai_quicklog/page.tsx 또는 신규 nutrition 탭)
  → base64 또는 multipart 이미지 업로드
  
[AI 서버] POST /api/ai/parse-diet-image (신규)
  → UploadFile 수신 (main.py:210 STT 패턴 참조)
  → 비전 모델(Gemini 또는 Ollama vision) → 음식명/양 추출
  → 기존 food-RAG 파이프라인(§4) 또는 LLM 추정 폴백
  → ParseDietItem[] 반환 (§5 스키마 재사용)
  
[FE] 추정 결과 리뷰 UI → 수정 가능 → dietApiClient.save()
```

**재사용 지점**:
- 파일 업로드 인프라: `main.py:11` `UploadFile` 임포트 이미 있음
- 응답 스키마: `ParseDietItem` (`§5-1`) 그대로 재사용
- 저장 경로: `dietApiClient.save()` → `POST /api/diet-logs` (§6-3)
- food-RAG (구축 후): `FoodRAGEngine.query(food_name)` → per-100g 조회 (§4-2)

### 9-7. 런타임 확인 필요 항목

| 확인 항목 | 확인 방법 |
|-----------|-----------|
| Ollama gemma4 variant의 이미지 입력 지원 여부 | `ollama show gemma4:latest` → "multimodal" 여부 |
| 이미지 토큰 추가 시 VRAM 여유 | `nvidia-smi` / Ollama 메모리 사용량 모니터링 |
| `langchain_google_genai` 설치 버전의 이미지 전달 API | `pip show langchain-google-genai` + 릴리즈 노트 |

---

## 핵심 요약

| 항목 | 결론 |
|------|------|
| **MVP 완료 상태** | Phase 0(N0-1~4) + Phase 1(N1-1~10) 전체 구현 완료 (2026-06-17). 영양 탭·대시보드·수동입력·목표설정·진행바·인증가드 운영 중 |
| **v1.x 최우선** | 항목 수정/삭제 UI + Ollama 헬스체크 개선 (1순위) → 음식 RAG (2순위) |
| **음식 RAG 재활용** | 임베딩 모델·검색 엔진 구조 재사용 가능. 데이터셋(식약처 공공 식품 DB) 신규 구축 필요. 현재 `_FOOD_PER_100G` 12종 테이블이 LLM null 보충으로 사용 중 |
| **내비 재편** | ✅ 완료. `MyPageContent.tsx` TabId + tabs 배열 수정, `WorkoutTab.tsx` 신규로 루틴·운동이력 통합 |
| **대시보드 데이터** | ✅ 완료. `DietSummaryCard.tsx` — `dietApiClient.getToday()` + kcal 진행 바 연결 |
| **체조성 → TDEE** | `user_profiles.body_weight_kg`, `body_fat_pct`, `gender`, `birth_date`, `training_days_per_week` 모두 BE에 존재. TDEE 공식(Mifflin-St Jeor) 확정 후 N2-7로 진행 가능 |
| **사진 입력 비전** | Gemini 2.5 Flash 지원 확실(`llm_router.py:183`). 로컬 Ollama 런타임 확인 필요. N2-1(음식 RAG) 완료 후 N3-1 착수 권장. §9-7 체크리스트 참고 |
