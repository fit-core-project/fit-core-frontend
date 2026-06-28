# 영양 기능 코드 감사 보고서

> 날짜: 2026-06-22  
> 대상: fit-core-backend (nutrition domain) + fit-core-frontend (nutrition / stats) + fit-core-ai (food engine)  
> 범위: N2-3/N2-4/N2-6 구현 포함 전체 영양 기능 표면

---

## 1. 검증 체크리스트 (9개 항목)

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| 1 | kcal 계산 로직 정확성 (`resolveKcal`) | ✅ 정상 | `DietLogService.java` ai→macro 필수, db→db kcal, manual→kcal 우선 else 4·4·9 |
| 2 | `@SoftDelete` 일관성 | ✅ 정상 | `DietLogEntity`, `NutritionTargetEntity` 모두 `@SoftDelete(columnName="is_deleted")` |
| 3 | KST 타임존 처리 | ✅ 정상 | `logDate`는 `LocalDate`(사용자 지정), FE `getKstToday()`는 `+9h` offset 올바름 |
| 4 | 데모 모드 분기 | ✅ 정상 | `dietApiClient.getDailySummary` → `isDemoMode()` 시 `[]` 반환; 빈 데이터 처리 OK |
| 5 | 에러 처리 완전성 | ❌ 누락 | `NutritionTab.tsx:158` — `getTarget()` `.catch()` 없음; 500 응답 시 unhandled rejection |
| 6 | 코드 중복 | ❌ 존재 | `getKstToday`/`getKstDate` 동일 로직이 4개 파일에 분산 |
| 7 | API 응답 null 안전성 | ✅ 정상 | `DietDailyAggregationResponse.orZero()` + FE `Number()` 변환 모두 안전 |
| 8 | 미량영양소 흐름 (AI→저장→편집→표시) | ❌ 버그 | `update()` 시 `sugarG/fiberG/sodiumMg` 소실 (BE + FE 양쪽 누락) |
| 9 | 차트 데이터 null 간격 처리 | ✅ 정상 | `buildChartData` null 삽입 + `connectNulls={false}` 올바름 |

---

## A. 개선 — 버그·코드 품질

### A-1. [BUG · 높음] 편집 시 미량영양소(당·식이섬유·나트륨) 소실

**코드 근거**

- BE: `DietLogService.java:191–196`
  ```java
  DietLogEntity updated = DietLogEntity.builder()
      ...
      .fatG(req.getFatG())
      .source("manual")      // ← sugarG / fiberG / sodiumMg 없음
      .build();
  ```
- FE: `ManualEntryModal.tsx:63–75` — `buildReq()`에 `sugarG/fiberG/sodiumMg` 필드 자체가 없음
- `DietLogUpdateRequest`에 해당 필드가 없으므로 FE→BE 어느 쪽도 전달·보존 불가

**임팩트**  
AI 로그로 저장된 음식(sugarG/fiberG/sodiumMg 포함)을 사용자가 편집하면 해당 데이터가 영구 소실됨. 음식 정보가 조용히 줄어드는 데이터 손실.

**노력**  
중간. `DietLogUpdateRequest`에 세 필드 추가 + `update()` 메서드에서 기존 값 fallback 복사 + FE ManualEntryModal에 선택 입력 필드(또는 숨겨진 보존 로직) 추가 필요.

---

### A-2. [BUG · 중간] `MissingServletRequestParameterException` → 500 반환

**코드 근거**  
`GlobalExceptionHandler.java` — `MissingServletRequestParameterException` 핸들러 없음.  
`GET /api/diet-logs/daily-summary` 호출 시 `from`/`to` 파라미터 누락 → 500 Internal Server Error.

**임팩트**  
API 클라이언트가 잘못된 HTTP status를 받아 오진단. 실제 테스트에서 확인된 문제.

**노력**  
낮음. `GlobalExceptionHandler`에 `@ExceptionHandler(MissingServletRequestParameterException.class)` 한 메서드 추가.

---

### A-3. [QUALITY · 중간] `getKstToday`/`getKstDate` 동일 로직 4중 정의

**코드 근거**  
```
ManualEntryModal.tsx:21       getKstDate()   → +9h offset .slice(0,10)
NutritionTab.tsx:11           getKstToday()  → 동일
NutritionTrendSection.tsx:21  getKstToday()  → 동일
NutritionCalendarSection.tsx  (내부 동일 로직)
```

**임팩트**  
KST 계산 방식 변경 시 4곳 모두 수정 필요. 이미 함수명이 `getKstDate`/`getKstToday`로 불일치.

**노력**  
낮음. `utils/dateUtils.ts` (또는 기존 date util) 에 `getKstToday(): string` 하나로 추출.

---

### A-4. [QUALITY · 낮음] `NutritionTab.tsx:158` — `getTarget()` catch 없음

**코드 근거**  
```typescript
nutritionTargetApiClient.getTarget()
    .then((t) => startTransition(() => setTarget(t)))
// catch 없음
```
반면 `NutritionTrendSection.tsx:106`은 `.catch(() => {})` 있음.

**임팩트**  
네트워크 오류 시 콘솔 unhandled rejection. 목표 표시 없이 조용히 실패.

**노력**  
최소. `.catch(() => {})` 한 줄 추가.

---

### A-5. [QUALITY · 낮음] 데모 `getDemoDietSummary` — 미량영양소 합계 반환 안 함

**코드 근거**  
`demoMode.ts:616–629`:
```typescript
return { date, totalKcal, totalProteinG, totalCarbsG, totalFatG, items: sorted }
// totalSugarG, totalFiberG, totalSodiumMg 없음
```
BE `DietSummaryResponse`는 해당 필드를 반환함.

**임팩트**  
데모 모드에서 미량영양소 합산 표시 불가. 또한 `demoDietLogs` 항목 자체에 `sugarG/fiberG/sodiumMg`가 없어 FE 아이템 행의 미량영양소 줄도 표시 안 됨.

**노력**  
낮음. `demoDietLogs`에 대표 항목 몇 개에 미량영양소 추가 + `getDemoDietSummary` 합산 로직 추가.

---

### A-6. [QUALITY · 낮음] `window.confirm()` 사용 (삭제 확인)

**코드 근거**  
`ManualEntryModal.tsx:108`:
```typescript
if (!window.confirm("이 항목을 삭제하시겠습니까?")) return
```

**임팩트**  
브라우저 기본 dialog는 앱 디자인 시스템과 불일치. 모바일에서 UX 일관성 저하.

**노력**  
중간. 인라인 confirm UI 또는 sonner `toast.promise` 패턴으로 교체.

---

## B. 추가 — 미구현 기능

### B-1. [MISSING · 높음] ManualEntryModal — 미량영양소 입력 필드 없음

**코드 근거**  
`ManualEntryModal.tsx` — 단백질/탄수화물/지방 입력 필드만 존재. `sugarG/fiberG/sodiumMg` 없음.

**임팩트**  
수동 입력으로는 미량영양소를 기록할 방법이 없음. AI 항목 편집 시에도 복원 불가 (A-1과 연계).

**노력**  
중간. 입력 필드 3개 추가(선택사항) + `DietLogRequest` 및 `DietLogUpdateRequest`에 필드 추가.

---

### B-2. [MISSING · 중간] 편집 모드에서 날짜 변경 불가

**코드 근거**  
`ManualEntryModal.tsx:buildReq()`:
```typescript
logDate: editItem?.logDate ?? defaultDate ?? getKstDate(),
```
편집 시 `editItem.logDate`가 고정됨. 날짜 변경 UI 없음.

**임팩트**  
잘못된 날짜로 기록한 식단을 수정할 방법이 없음. 삭제 후 재입력만 가능.

**노력**  
낮음. 편집 모드에서 날짜 input 노출 + `DietLogUpdateRequest` logDate 필드 확인.

---

### B-3. [MISSING · 낮음] `food_rag_engine.py` 소스 파일 없음

**코드 근거**  
`fit-core-ai/engines/food/__pycache__/food_rag_engine.cpython-310.pyc` 만 존재.  
`.py` 소스는 저장소에 없음.

**임팩트**  
AI 식품 RAG 엔진 소스 파악·수정 불가. 빌드 환경이 바뀌면 `.pyc`도 무효.

**노력**  
소스 복원 또는 재작성 필요. 규모 미파악.

---

### B-4. [MISSING · 낮음] 달력에서 날짜 간 식단 복사 기능 없음

**코드 근거**  
`NutritionCalendarSection.tsx` — 클릭 → 해당 날 상세 보기만 가능. 복사 기능 없음.

**임팩트**  
반복되는 식단(예: 같은 아침 메뉴)을 매번 재입력해야 함.

**노력**  
높음. 복사 API 엔드포인트 + FE 복사 UI 필요.

---

## C. 제거·단순화

### C-1. 중복 KST 유틸 함수 통합 (→ A-3과 동일)

삭제 대상: `ManualEntryModal.tsx:21–27`, `NutritionTab.tsx:10–12`, `NutritionTrendSection.tsx:20–22` 내 인라인 함수.  
공통 유틸 하나로 교체.

---

### C-2. `NutritionTab.tsx` 내 색상 헬퍼 함수 분리

**코드 근거**  
`NutritionTab.tsx:75–117` — `kcalBarPct`, `kcalBarColor`, `macroStatus`, `macroBarColor`, `macroBarPct`, `macroGoalText` 6개 함수가 컴포넌트 파일 상단에 인라인.

**판단**  
파일이 417줄로 길어졌으나 함수들이 이미 잘 명명되어 있음. 필수 제거는 아니나, 동일 파일 내로 유지하면서 `// --- 색상 헬퍼 ---` 구분자 정도면 충분.

---

### C-3. `NutritionTargetService.upsert` — 불필요한 soft-delete 재확인

**코드 근거**  
`NutritionTargetService.java:upsert()`: `findByUserId` 결과에서 `existingId` 추출 후 builder에 주입. Hibernate `@SoftDelete`가 `findByUserId`에서 삭제된 항목을 자동 필터하므로 기존 삭제 타겟과의 ID 충돌 없음.

**판단**  
현재 구현이 올바름. 제거 대상 없음.

---

## D. UX·UI

### D-1. [UX · 중간] 달력 "목표 없음 + 데이터 있음" → 녹색 표시 혼란

**코드 근거**  
`NutritionCalendarSection.tsx:dayColor()`:
```typescript
if (!kcalGoal) return "bg-emerald-400"   // 목표 없어도 데이터 있으면 녹색
```

**문제**  
목표가 없는 상태에서 녹색(달성)은 오해를 유발. 사용자는 "잘 먹었다"고 착각.

**제안**  
데이터 있고 목표 없음 → `bg-slate-300`(회색) 또는 `bg-blue-300`(중립).

---

### D-2. [UX · 낮음] 편집 모달에서 대상 날짜 미표시

**코드 근거**  
`ManualEntryModal.tsx` — 헤더에 "식단 수정" 텍스트만 표시. 어느 날짜 식단인지 표시 없음.

**제안**  
헤더에 `editItem.logDate` (예: "2026-06-15 식단 수정") 추가.

---

### D-3. [UX · 낮음] 비어있는 달력 날짜 셀에 클릭 이벤트 없음

**코드 근거**  
`NutritionCalendarSection.tsx` — `row`가 없는 날짜도 클릭 가능하게 설정되어 있음. 그러나 클릭 시 빈 NutritionTab("기록이 없어요")이 열림.

**판단**  
현재 동작이 의도적임 (해당 날짜에 식단 추가 가능). UX 문제 아님.

---

## 우선순위 요약

| 순위 | 항목 | 분류 | 파일 | 노력 |
|------|------|------|------|------|
| 🔴 P1 | 편집 시 미량영양소 소실 | A-1 Bug | `DietLogService.java`, `ManualEntryModal.tsx`, `DietLogUpdateRequest.java` | 중간 |
| 🔴 P1 | ManualEntryModal 미량영양소 입력 필드 부재 | B-1 Feature | `ManualEntryModal.tsx` | 중간 |
| 🟡 P2 | 달력 "목표 없음→녹색" 색상 오해 | D-1 UX | `NutritionCalendarSection.tsx:dayColor()` | 낮음 |
| 🟡 P2 | 500 대신 400 반환 (`MissingServletRequestParameterException`) | A-2 Bug | `GlobalExceptionHandler.java` | 낮음 |
| 🟡 P2 | getKstToday 4중 중복 | A-3 / C-1 | 4개 파일 | 낮음 |
| 🟢 P3 | `NutritionTab` getTarget catch 누락 | A-4 | `NutritionTab.tsx:158` | 최소 |
| 🟢 P3 | 편집 모드 날짜 변경 불가 | B-2 | `ManualEntryModal.tsx` | 낮음 |
| 🟢 P3 | 편집 모달 날짜 미표시 | D-2 | `ManualEntryModal.tsx` | 최소 |
| 🟢 P3 | 데모 미량영양소 합산 누락 | A-5 | `demoMode.ts` | 낮음 |
| ⚪ P4 | `window.confirm()` 교체 | A-6 | `ManualEntryModal.tsx:108` | 중간 |
| ⚪ P4 | `food_rag_engine.py` 소스 없음 | B-3 | `fit-core-ai/engines/food/` | 미파악 |
| ⚪ P4 | 날짜 간 식단 복사 | B-4 | 신규 기능 | 높음 |

---

> **총평**: P1 이슈 2개는 데이터 정확성에 직접 영향을 미치는 버그로 즉시 수정 권장. P2 이슈 3개는 작업 비용 대비 사용자 신뢰도 개선 효과가 큼. P3/P4는 다음 스프린트 백로그 편입 검토.
