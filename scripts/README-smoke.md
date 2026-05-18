# Live smoke verification

`smoke.sh` is a live E2E probe, not a local mock runner. It calls the running backend in this order:

1. `POST /api/routines/generate`
2. `POST /api/routines/drafts/:draftId/finalize`
3. `POST /api/workouts`
4. `GET /api/routines/finals/:finalId`
5. `GET /api/exercises/:exerciseId/recent-record`

Run it only after the backend is listening and you have a real JWT:

```bash
BASE_URL=http://localhost:8080 TOKEN="$JWT" bash ./scripts/smoke.sh
```

Each run writes a timestamped evidence log under `artifacts/smoke/` and exits non-zero if the backend is unreachable, a token is missing, or any full-loop step fails.
