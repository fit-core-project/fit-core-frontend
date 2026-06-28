# Golden API Fixture Pack v3.0

> Frontend local copy notice:
> This directory is a local copy of the root `docs/ops/golden-examples/` fixture pack.
> The canonical SSOT is the root `docs/ops/golden-examples/` directory.
> This frontend copy exists only for FE tests, MSW handlers, and dev tooling convenience.
> Golden JSON changes must be made in the root SSOT first, then copied or generated into this directory.
> Directly editing only the FE copy is prohibited because it creates drift.
> Backend `RoutineContractTest` is also aligned to the root fixture pack.

Created: 2026-05-19
Status: active

## Purpose

This folder mirrors the public API fixture pack for Fit-Core routine generation, draft update, finalize, and workout save flows. The canonical source of truth is the root `docs/ops/golden-examples/` directory.

## v3.0 Decisions

- Public generate requests keep `currentPainAreas` and `currentDoms`.
- `bodyPartConditions[]` is an internal normalize-only shape and is not a public request contract.
- FE-facing slug values flow through FE -> BE -> AI -> `exercise_tier` lookup/filtering without runtime alias expansion.
- Legacy enum values such as `CHEST_UPPER`, `CHEST_MID`, `CHEST_LOWER`, `ARM_TRICEPS`, and `LEG_QUADS` are not active public contract values.
- `leftShoulder`, `rightShoulder`, and `SHOULDER_JOINT` are not v3 active values.
- `finalize` is a hidden write triggered by Start Workout, not a visible user flow.
- Java backend owns the public API.
- Python AI owns routine generation and `exercise_tier` candidate lookup/filtering.

## Active Slug Sets

Trainable muscle slugs are used for `targetMuscles`, `targetSplitLabel` expansion, `primary_muscle`, and `secondary_muscle`:

`abductors`, `abs`, `adductor`, `back-deltoids`, `biceps`, `calves`, `chest`, `forearm`, `front-deltoids`, `gluteal`, `hamstring`, `lower-back`, `neck`, `obliques`, `quadriceps`, `trapezius`, `triceps`, `upper-back`

Pain area slugs are used for `currentPainAreas` and `pain_triggers`:

`abductors`, `abs`, `adductor`, `back-deltoids`, `biceps`, `calves`, `chest`, `forearm`, `front-deltoids`, `gluteal`, `hamstring`, `head`, `knees`, `left-soleus`, `lower-back`, `neck`, `obliques`, `quadriceps`, `right-soleus`, `trapezius`, `triceps`, `upper-back`

`head`, `knees`, `left-soleus`, and `right-soleus` are pain-area-only values.

Detailed rules are in `muscle-slug-whitelist-v3-2026-05-19.md`.

## Files

| File | Purpose |
|---|---|
| `generate.request.golden.json` | `POST /api/routines/generate` request fixture |
| `generate.response.success.golden.json` | generate success response fixture |
| `generate.response.fallback.golden.json` | generate fallback response fixture |
| `generate.response.failed.empty-candidate.golden.json` | empty-candidate failed response fixture |
| `ai-adapter.request.golden.json` | BE -> AI adapter request fixture |
| `draft-update.request.golden.json` | `PATCH /api/routines/drafts/{routineDraftId}` request fixture |
| `finalize.request.golden.json` | hidden finalize request fixture |
| `finalize.response.golden.json` | hidden finalize response fixture |
| `workout-save.request.golden.json` | `POST /api/workouts` request fixture |
| `workout-save.response.golden.json` | workout save response fixture |
| `contract-checklist.md` | FE/BE/AI contract checklist |
| `render-ready-checklist.md` | render-ready checklist |
