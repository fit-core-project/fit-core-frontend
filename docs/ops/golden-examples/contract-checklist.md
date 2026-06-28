# Contract Checklist

## Generate Request

- [ ] FE sends `targetSplitLabel` when a preset exists.
- [ ] FE sends `readinessLevel`, defaulting to `"normal"`.
- [ ] FE sends lowercase `goal`: `strength`, `hypertrophy`, or `endurance`.
- [ ] FE sends `currentPainAreas` and `currentDoms`, not `bodyPartConditions`.
- [ ] FE sends `unavailableEquipment` as a blacklist (equipment the user **cannot** use, not a list of permitted equipment).

## Backend Adapter

- [ ] BE preserves public `currentPainAreas` values when building AI `painAreas`.
- [ ] BE preserves public `currentDoms[].bodyPart` values when building AI `domsData`; it only converts DOMS level text to integers.
- [ ] BE maps public `unavailableEquipment` to AI `equipment` without inversion.
- [ ] BE never exposes `bodyPartConditions[]` as public request.
- [ ] BE owns authoritative `routineDraftId`.

## Equipment Filtering Policy

- `unavailableEquipment` is a **blacklist**. Exercises are excluded when their `equipment_req` token appears in this list.
- This is NOT an allowlist. An exercise requiring equipment NOT in `unavailableEquipment` is always permitted.
- BODYWEIGHT exercises are always permitted regardless of `unavailableEquipment` contents.
- This policy applies at every layer: FE request assembly, BE adapter, AI candidate query, AI post-validation guard, and BE fallback candidate selection.

## AI Pain Filtering

- [ ] AI compares public pain slugs directly against `exercise_tier.pain_triggers`.
- [ ] `exercise_tier.pain_triggers` stores FE-facing pain slugs that match public `currentPainAreas`.
- [ ] The same pain slug filtering is used in post-validation (`_candidate_is_safe`), not only in SQL.
- [ ] The active golden case `currentPainAreas: ["front-deltoids"]` must exclude candidates whose `pain_triggers` include `front-deltoids`.
- [ ] Do not change public `currentPainAreas` to DB tokens; public request remains UI-friendly.

## Generate Response

- [ ] `success` and `fallback` responses are render-ready.
- [ ] `totalEstimatedTime` is included.
- [ ] `routineBlocks[].order` is included.
- [ ] `routineBlocks[].prescription[].setType` is included.
- [ ] `setIndex` is 1-based.
- [ ] fallback responses have non-empty `routineBlocks`.
- [ ] failed responses may have empty `routineBlocks`.

## Finalize

- [ ] There is no visible finalize screen.
- [ ] Start Workout triggers hidden finalize.
- [ ] Finalize request saves user-edited `finalRoutinePayload`.
- [ ] Finalize response returns `routineFinalId`, not `id`.
- [ ] `targetSplitLabel` is not empty in final response.

## Workout Save

- [ ] Workout save request includes `sourceRoutineFinalId`.
- [ ] Workout save request includes `exerciseOrder` and 1-based `setIndex`.
- [ ] Workout save request includes `currentPainAreas`, `currentDoms`, `unavailableEquipment`.
- [ ] Workout save response returns `currentDoms`, not `doms`.

## Deprecated

- [ ] Do not use `llmError`.
- [ ] Do not use uppercase goal values in new public request fixtures.
- [ ] Do not use `id` as the public finalize response key.
