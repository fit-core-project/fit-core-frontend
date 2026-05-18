#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
TOKEN="${TOKEN:-REPLACE_ME}"
AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"
PYTHON_BIN="${PYTHON_BIN:-python}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVIDENCE_DIR="${EVIDENCE_DIR:-$SCRIPT_DIR/../artifacts/smoke}"
GOLDEN_DIR="$SCRIPT_DIR/../docs/ops/golden-examples"
GENERATE_GOLDEN="$GOLDEN_DIR/generate.request.golden.json"
FINALIZE_GOLDEN="$GOLDEN_DIR/finalize.request.golden.json"
WORKOUT_GOLDEN="$GOLDEN_DIR/workout-save.request.golden.json"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
EVIDENCE_LOG="${EVIDENCE_LOG:-$EVIDENCE_DIR/live-smoke-$TIMESTAMP.log}"

mkdir -p "$EVIDENCE_DIR"
exec > >(tee "$EVIDENCE_LOG") 2>&1

PASS=0
FAIL=0

check() {
  local label="$1" status="$2" expected="$3"
  if [ "$status" -eq "$expected" ]; then
    echo "  [PASS] $label (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label - expected HTTP $expected, got $status"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Live backend smoke evidence"
echo "  timestamp = $(date -Iseconds)"
echo "  baseUrl   = $BASE_URL"
echo "  logFile   = $EVIDENCE_LOG"

if [ "$TOKEN" = "REPLACE_ME" ]; then
  echo "  [FAIL] TOKEN is still REPLACE_ME; provide a real JWT for live backend verification."
  exit 2
fi

echo ""
echo "0. Backend Reachability"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/swagger-ui/index.html")
if [ "$HEALTH_STATUS" -eq 200 ] || [ "$HEALTH_STATUS" -eq 302 ]; then
  echo "  [PASS] backend reachable (HTTP $HEALTH_STATUS)"
else
  echo "  [FAIL] backend not reachable at $BASE_URL (HTTP $HEALTH_STATUS)"
  exit 3
fi

echo ""
echo "1. Generate"

GENERATE_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/routines/generate" \
  -H "$AUTH" -H "$JSON" --data-binary "@$GENERATE_GOLDEN")

GENERATE_BODY_RES=$(echo "$GENERATE_RES" | head -n -1)
GENERATE_STATUS=$(echo "$GENERATE_RES" | tail -n 1)
check "POST /api/routines/generate" "$GENERATE_STATUS" 200

DRAFT_ID=$(printf '%s' "$GENERATE_BODY_RES" | "$PYTHON_BIN" -c 'import json,sys; print(json.load(sys.stdin).get("routineDraftId",""))')
echo "  routineDraftId = $DRAFT_ID"

echo ""
echo "2. Finalize"

FINALIZE_BODY=$("$PYTHON_BIN" - "$FINALIZE_GOLDEN" "$(date +%Y-%m-%d)" <<'PY'
import json, sys
path, date = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    payload = json.load(f)
payload["targetWorkoutDate"] = date
print(json.dumps(payload))
PY
)

FINALIZE_RES=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE_URL/api/routines/drafts/$DRAFT_ID/finalize" \
  -H "$AUTH" -H "$JSON" -d "$FINALIZE_BODY")

FINALIZE_BODY_RES=$(echo "$FINALIZE_RES" | head -n -1)
FINALIZE_STATUS=$(echo "$FINALIZE_RES" | tail -n 1)
check "POST /api/routines/drafts/:draftId/finalize" "$FINALIZE_STATUS" 200

FINAL_ID=$(printf '%s' "$FINALIZE_BODY_RES" | "$PYTHON_BIN" -c 'import json,sys; print(json.load(sys.stdin).get("routineFinalId",""))')
echo "  routineFinalId = $FINAL_ID"

echo ""
echo "3. Workout Save"

WORKOUT_BODY=$("$PYTHON_BIN" - "$WORKOUT_GOLDEN" "$(date +%Y-%m-%d)" "$FINAL_ID" <<'PY'
import json, sys
path, date, final_id = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, encoding="utf-8") as f:
    payload = json.load(f)
payload["workoutDate"] = date
payload["sourceRoutineFinalId"] = final_id
print(json.dumps(payload))
PY
)

WORKOUT_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/workouts" \
  -H "$AUTH" -H "$JSON" -d "$WORKOUT_BODY")

WORKOUT_BODY_RES=$(echo "$WORKOUT_RES" | head -n -1)
WORKOUT_STATUS=$(echo "$WORKOUT_RES" | tail -n 1)
check "POST /api/workouts" "$WORKOUT_STATUS" 200

WORKOUT_ID=$(printf '%s' "$WORKOUT_BODY_RES" | "$PYTHON_BIN" -c 'import json,sys; data=json.load(sys.stdin); print(data.get("workoutSessionId") or data.get("id",""))')
echo "  workoutSessionId = $WORKOUT_ID"

echo ""
echo "4. Final Get"

FINAL_GET_RES=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/routines/finals/$FINAL_ID" \
  -H "$AUTH")

FINAL_GET_STATUS=$(echo "$FINAL_GET_RES" | tail -n 1)
check "GET /api/routines/finals/:finalId" "$FINAL_GET_STATUS" 200

echo ""
echo "5. Recent Read"

EXERCISE_ID="barbell_bench_press"
RECENT_RES=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/exercises/$EXERCISE_ID/recent-record" \
  -H "$AUTH")

RECENT_BODY_RES=$(echo "$RECENT_RES" | head -n -1)
RECENT_STATUS=$(echo "$RECENT_RES" | tail -n 1)

if [ "$RECENT_STATUS" -eq 200 ] || [ "$RECENT_STATUS" -eq 404 ]; then
  echo "  [PASS] GET /api/exercises/:exerciseId/recent-record (HTTP $RECENT_STATUS)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] GET /api/exercises/:exerciseId/recent-record - unexpected HTTP $RECENT_STATUS"
  FAIL=$((FAIL + 1))
fi

if [ "$RECENT_STATUS" -eq 200 ]; then
  echo "  defaultWeight = $(printf '%s' "$RECENT_BODY_RES" | "$PYTHON_BIN" -c 'import json,sys; print(json.load(sys.stdin).get("defaultWeight","N/A"))')"
  echo "  defaultReps   = $(printf '%s' "$RECENT_BODY_RES" | "$PYTHON_BIN" -c 'import json,sys; print(json.load(sys.stdin).get("defaultReps","N/A"))')"
fi

echo ""
echo "Result"
echo "  PASS: $PASS / $((PASS + FAIL))"
[ "$FAIL" -gt 0 ] && echo "  FAIL: $FAIL" && exit 1
echo "  all smoke checks passed"
echo "  evidence saved to $EVIDENCE_LOG"
