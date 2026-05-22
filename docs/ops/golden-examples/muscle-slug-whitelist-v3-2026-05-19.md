# Fit-Core Slug Contract v3

Created: 2026-05-19
Status: active

## Decision

Fit-Core uses the FE-facing slug values as the runtime contract from FE to BE to AI to `exercise_tier` lookup/filtering. Runtime adapters must not translate these values into a second enum family or expand alias-like values.

## Trainable Muscle Slugs

Use these values for `targetMuscles`, `targetSplitLabel` expansion, `exercise_tier.primary_muscle`, and `exercise_tier.secondary_muscle`.

`abductors`, `abs`, `adductor`, `back-deltoids`, `biceps`, `calves`, `chest`, `forearm`, `front-deltoids`, `gluteal`, `hamstring`, `lower-back`, `neck`, `obliques`, `quadriceps`, `trapezius`, `triceps`, `upper-back`

## Pain Area Slugs

Use these values for public `currentPainAreas` and `exercise_tier.pain_triggers`.

`abductors`, `abs`, `adductor`, `back-deltoids`, `biceps`, `calves`, `chest`, `forearm`, `front-deltoids`, `gluteal`, `hamstring`, `head`, `knees`, `left-soleus`, `lower-back`, `neck`, `obliques`, `quadriceps`, `right-soleus`, `trapezius`, `triceps`, `upper-back`

`head`, `knees`, `left-soleus`, and `right-soleus` are pain-area-only values. They are not trainable target muscle values unless `exercise_tier.primary_muscle` or `secondary_muscle` changes.

## Adapter Rule

- FE sends selected slug values as public payload values.
- BE preserves `targetMuscles` values when building the AI request.
- BE preserves `currentPainAreas` values when building AI `painAreas[].bodyPart`.
- BE preserves `currentDoms[].bodyPart` values when building AI `domsData`; BE may only convert DOMS level text to integer severity.
- AI uses the received target muscle slug values directly for `exercise_tier.primary_muscle` candidate lookup.
- AI uses the received pain slug values directly for `exercise_tier.pain_triggers` filtering.
- Alias-like values such as `glutes`, `lats`, `deltoids`, or `knees` must not be expanded at runtime. If they are intended to work as target muscles, the FE contract and `exercise_tier` data must first be changed to contain those exact values.

## Superseded Values

- `leftShoulder`
- `rightShoulder`
- `shoulder` as public pain value
- `SHOULDER_JOINT`
- `CHEST_UPPER`
- `CHEST_MID`
- `CHEST_LOWER`
- `CHEST_MID_LOWER`
- `ARM_TRICEPS`
- `ARM_BICEPS`
- `BACK_LATS`
- Other uppercase DB enum style muscle codes
