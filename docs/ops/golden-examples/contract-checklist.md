# Contract Checklist

## Generate Request

- [ ] FE sends `targetSplitLabel` when a preset exists.
- [ ] FE sends `readinessLevel`, defaulting to `"normal"`.
- [ ] FE sends lowercase `goal`: `strength`, `hypertrophy`, or `endurance`.
- [ ] FE sends `currentPainAreas` and `currentDoms`, not `bodyPartConditions`.
- [ ] FE sends `unavailableEquipment` as a blacklist.

## Backend Adapter

- [ ] BE maps public `currentPainAreas` to AI `painAreas`.
- [ ] BE maps public `currentDoms[]` to AI `domsData` with DB muscle enum keys.
- [ ] BE maps public `unavailableEquipment` to AI `equipment`.
- [ ] BE never exposes `bodyPartConditions[]` as public request.
- [ ] BE owns authoritative `routineDraftId`.

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
