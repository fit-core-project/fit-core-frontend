# Fit-Core Golden API Fixture Pack v2

Issued: 2026-05-14

Purpose:

- This pack is the developer-facing contract seed for MVP real attach.
- Treat this folder as the current SSOT for public API fixture examples.
- Older Notion attachments and frontend-local golden files are superseded by this pack.

## Locked Product Flow

Visible UX:

1. Generate recommendation
2. Edit recommendation
3. Start workout

Finalize is not a visible screen. It is a hidden write event triggered by the Start Workout button.

## Public vs Internal Shape

Public FE -> BE generate/workout request keeps UI-friendly fields:

- `currentPainAreas`
- `currentDoms`
- `unavailableEquipment`

Internal BE -> AI adapter uses engine-friendly fields:

- `painAreas`
- `domsData`
- `equipment`

`bodyPartConditions[]` is internal normalize only. Do not expose it as public request shape.

## Status Rules

Allowed `generationStatus`:

- `success`: AI created a usable routine.
- `fallback`: AI/network/schema failed, but backend/AI returned a usable fallback routine.
- `failed`: no usable routine can be made.

Allowed `statusReasonCode`:

- `none`
- `llmTimeout`
- `schemaError`
- `networkError`
- `emptyCandidate`

Do not use old `llmError` in new code or new fixtures.

## Required Generate Response Shape

Every `success` and `fallback` generate response must include:

- `routineDraftId`
- `generationStatus`
- `statusReasonCode`
- `isFallback`
- `totalEstimatedTime`
- `summaryTitle`
- `rationaleSummary`
- `warnings`
- `routineBlocks`

Every `routineBlocks[]` item must include:

- `order`
- `exerciseId`
- `exerciseName`
- `movementPattern`
- `primaryMuscles`
- `equipmentType`
- `defaultRestSec`
- `exerciseRationale`
- `substitutionCandidates`
- `prescription`

Every `prescription[]` item must include:

- `setIndex`
- `setType`
- `targetReps`
- `targetWeightKg`
- `targetRir`
- `targetRestSec`

`setIndex` is 1-based.

## File Index

- `generate.request.golden.json`: FE -> BE public generate request.
- `ai-adapter.request.golden.json`: BE -> AI internal adapter request.
- `generate.response.success.golden.json`: render-ready success response.
- `generate.response.fallback.golden.json`: render-ready usable fallback response.
- `generate.response.failed.empty-candidate.golden.json`: no usable routine response.
- `draft-update.request.golden.json`: edited draft payload shape.
- `finalize.request.golden.json`: hidden finalize request from Start Workout.
- `finalize.response.golden.json`: final routine response with `routineFinalId`.
- `workout-save.request.golden.json`: workout completion save request.
- `workout-save.response.golden.json`: workout save response; read shape uses `currentDoms`.
- `contract-checklist.md`: implementation checklist.

## Copy / Sync Rule

If frontend keeps local copies under `fit-core-frontend/docs/ops/golden-examples`, those files must be copied from this pack or generated from this pack.

Do not maintain a separate frontend-local contract generation.
