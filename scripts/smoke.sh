#!/usr/bin/env bash
# =============================================================================
# fit-core  |  P1-04 Curl Smoke Pack
# 커버리지: generate → finalize → workout save → final get → recent read
#
# 사전 요구사항:
#   - jq 설치 (brew install jq / apt install jq)
#   - 백엔드 서버 실행 중 (BASE_URL 기본값: http://localhost:8080)
#   - 로그인 후 발급된 JWT를 TOKEN에 설정
#
# 사용법:
#   BASE_URL=http://localhost:8080 TOKEN=<jwt> bash scripts/smoke.sh
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
TOKEN="${TOKEN:-REPLACE_ME}"
AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

PASS=0
FAIL=0

check() {
  local label="$1" status="$2" expected="$3"
  if [ "$status" -eq "$expected" ]; then
    echo "  [PASS] $label (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected HTTP $expected, got $status"
    FAIL=$((FAIL + 1))
  fi
}

# =============================================================================
# 1. Generate  —  POST /api/routines/generate
# =============================================================================
echo ""
echo "━━━ 1. Generate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GENERATE_BODY='{
  "targetMuscles": ["chest", "triceps"],
  "timeAvailableMin": 60,
  "currentPainAreas": [],
  "unavailableEquipment": [],
  "currentDoms": [],
  "goal": "HYPERTROPHY",
  "userNote": "벤치프레스 위주로 부탁해"
}'

GENERATE_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/routines/generate" \
  -H "$AUTH" -H "$JSON" -d "$GENERATE_BODY")

GENERATE_BODY_RES=$(echo "$GENERATE_RES" | head -n -1)
GENERATE_STATUS=$(echo "$GENERATE_RES" | tail -n 1)

check "POST /api/routines/generate" "$GENERATE_STATUS" 200

DRAFT_ID=$(echo "$GENERATE_BODY_RES" | jq -r '.routineDraftId // empty')
echo "  routineDraftId = $DRAFT_ID"

# =============================================================================
# 2. Finalize  —  POST /api/routines/drafts/{routineDraftId}/finalize
# =============================================================================
echo ""
echo "━━━ 2. Finalize ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FINALIZE_BODY=$(jq -n \
  --argjson payload "$GENERATE_BODY_RES" \
  '{
    targetWorkoutDate: (now | strftime("%Y-%m-%d")),
    finalRoutinePayload: $payload,
    acceptedWithoutEdits: true,
    userEditSummary: ["수정 없이 시작"]
  }')

FINALIZE_RES=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE_URL/api/routines/drafts/$DRAFT_ID/finalize" \
  -H "$AUTH" -H "$JSON" -d "$FINALIZE_BODY")

FINALIZE_BODY_RES=$(echo "$FINALIZE_RES" | head -n -1)
FINALIZE_STATUS=$(echo "$FINALIZE_RES" | tail -n 1)

check "POST /api/routines/drafts/:draftId/finalize" "$FINALIZE_STATUS" 200

FINAL_ID=$(echo "$FINALIZE_BODY_RES" | jq -r '.routineFinalId // .id // empty')
echo "  routineFinalId = $FINAL_ID"

# =============================================================================
# 3. Workout Save  —  POST /api/workouts
# =============================================================================
echo ""
echo "━━━ 3. Workout Save ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TODAY=$(date +%Y-%m-%d)

WORKOUT_BODY=$(jq -n --arg date "$TODAY" --arg finalId "$FINAL_ID" '{
  workoutDate: $date,
  splitLabel: "스모크 테스트 루틴",
  sourceRoutineFinalId: $finalId,
  timeAvailableMin: 60,
  durationMin: 45,
  readinessLevel: "normal",
  currentPainAreas: [],
  currentDoms: [],
  unavailableEquipment: [],
  sets: [
    {
      exerciseId: "barbell_bench_press",
      exerciseNameSnapshot: "바벨 벤치프레스",
      setIndex: 1,
      setType: "working",
      trackingMode: "weightReps",
      weightKg: 80,
      reps: 8,
      rir: 2,
      isFailure: false,
      restSec: 90
    },
    {
      exerciseId: "barbell_bench_press",
      exerciseNameSnapshot: "바벨 벤치프레스",
      setIndex: 2,
      setType: "working",
      trackingMode: "weightReps",
      weightKg: 80,
      reps: 7,
      rir: 1,
      isFailure: false,
      restSec: 90
    },
    {
      exerciseId: "barbell_bench_press",
      exerciseNameSnapshot: "바벨 벤치프레스",
      setIndex: 3,
      setType: "working",
      trackingMode: "weightReps",
      weightKg: 77.5,
      reps: 6,
      rir: 0,
      isFailure: true,
      restSec: 120
    }
  ]
}')

WORKOUT_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/workouts" \
  -H "$AUTH" -H "$JSON" -d "$WORKOUT_BODY")

WORKOUT_BODY_RES=$(echo "$WORKOUT_RES" | head -n -1)
WORKOUT_STATUS=$(echo "$WORKOUT_RES" | tail -n 1)

check "POST /api/workouts" "$WORKOUT_STATUS" 200

WORKOUT_ID=$(echo "$WORKOUT_BODY_RES" | jq -r '.workoutSessionId // .id // empty')
echo "  workoutSessionId = $WORKOUT_ID"

# =============================================================================
# 4. Final Get  —  GET /api/routines/finals/{routineFinalId}
# =============================================================================
echo ""
echo "━━━ 4. Final Get ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FINAL_GET_RES=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/routines/finals/$FINAL_ID" \
  -H "$AUTH")

FINAL_GET_STATUS=$(echo "$FINAL_GET_RES" | tail -n 1)

check "GET /api/routines/finals/:finalId" "$FINAL_GET_STATUS" 200

# =============================================================================
# 5. Recent Read  —  GET /api/exercises/{exerciseId}/recent-record
# =============================================================================
echo ""
echo "━━━ 5. Recent Read ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EXERCISE_ID="barbell_bench_press"

RECENT_RES=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/exercises/$EXERCISE_ID/recent-record" \
  -H "$AUTH")

RECENT_BODY_RES=$(echo "$RECENT_RES" | head -n -1)
RECENT_STATUS=$(echo "$RECENT_RES" | tail -n 1)

# 404 = 기록 없음 (정상), 200 = 기록 있음
if [ "$RECENT_STATUS" -eq 200 ] || [ "$RECENT_STATUS" -eq 404 ]; then
  echo "  [PASS] GET /api/exercises/:exerciseId/recent-record (HTTP $RECENT_STATUS)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] GET /api/exercises/:exerciseId/recent-record — unexpected HTTP $RECENT_STATUS"
  FAIL=$((FAIL + 1))
fi

if [ "$RECENT_STATUS" -eq 200 ]; then
  echo "  defaultWeight = $(echo "$RECENT_BODY_RES" | jq -r '.defaultWeight // "N/A"')"
  echo "  defaultReps   = $(echo "$RECENT_BODY_RES" | jq -r '.defaultReps // "N/A"')"
fi

# =============================================================================
# 결과 요약
# =============================================================================
echo ""
echo "━━━ 결과 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PASS: $PASS / $((PASS + FAIL))"
[ "$FAIL" -gt 0 ] && echo "  FAIL: $FAIL" && exit 1
echo "  모든 smoke 테스트 통과"
