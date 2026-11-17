import type { RoutineBlock } from "@/types/routine"
import type { WorkoutSetSaveRequest } from "@/lib/api/workout/workoutApiClient"
import type { ActualSet } from "@/utils/activeWorkout"

export type WeightUnit = "kg" | "lbs"

export const KG_PER_LB = 0.45359237
/** Backend limits (WorkoutSetRequest): weightKg in (0, 500], reps in [1, 50]. */
export const MAX_WEIGHT_KG = 500
export const MIN_REPS = 1
export const MAX_REPS = 50
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 }

const round = (value: number, digits: number) => {
    const f = 10 ** digits
    return Math.round(value * f) / f
}

export const setKey = (blockIndex: number, setArrayIndex: number) => `${blockIndex}-${setArrayIndex}`

/** kg → number shown in the user's unit (kg to 2 decimals, lbs to 1 decimal). */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
    return unit === "kg" ? round(kg, 2) : round(kg / KG_PER_LB, 1)
}

export const unitLabel = (unit: WeightUnit) => (unit === "kg" ? "kg" : "lb")

/** "60kg", "132.3lb", or "맨몸" for null/0. */
export function formatWeight(kg: number | null, unit: WeightUnit): string {
    if (kg === null || kg <= 0) return "맨몸"
    return `${toDisplayWeight(kg, unit)}${unitLabel(unit)}`
}

/** Normalizes a weight for the API: 0 or less means bodyweight (null); capped at the backend maximum. */
export function normalizeWeightKg(kg: number | null): number | null {
    if (kg === null || !Number.isFinite(kg) || kg <= 0) return null
    return Math.min(MAX_WEIGHT_KG, round(kg, 2))
}

/**
 * One stepper tap. Steps from the value as displayed in the user's unit and snaps to the step grid
 * (2.5kg / 5lb), so repeated taps don't drift. Stepping down to 0 gives bodyweight (null).
 */
export function stepWeight(kg: number | null, unit: WeightUnit, direction: 1 | -1): number | null {
    const step = WEIGHT_STEP[unit]
    const shown = kg === null ? 0 : toDisplayWeight(kg, unit)
    const eps = 1e-9
    const next = direction === 1 ? Math.floor(shown / step + eps) * step + step : Math.ceil(shown / step - eps) * step - step
    if (next <= 0) return null
    const nextKg = unit === "kg" ? next : next * KG_PER_LB
    return Math.min(MAX_WEIGHT_KG, round(nextKg, 2))
}

export function clampReps(reps: number): number {
    if (!Number.isFinite(reps)) return MIN_REPS
    return Math.min(MAX_REPS, Math.max(MIN_REPS, Math.round(reps)))
}

export const stepReps = (reps: number, direction: 1 | -1) => clampReps(reps + direction)

/** The finish screen's 3-choice effort rating → session RPE. */
export const EFFORT_RPE: Record<1 | 2 | 3, number> = { 1: 6, 2: 8, 3: 10 }

export function effortToRpe(score: number): number {
    return EFFORT_RPE[score as 1 | 2 | 3] ?? 8
}

/** Default (target) values for a set the user hasn't adjusted. */
export function targetActual(block: RoutineBlock, setArrayIndex: number): ActualSet {
    const set = block.prescription[setArrayIndex]
    return { weightKg: set?.targetWeightKg ?? null, reps: clampReps(set?.targetReps ?? MIN_REPS) }
}

export function actualFor(actuals: Record<string, ActualSet>, block: RoutineBlock, blockIndex: number, setArrayIndex: number): ActualSet {
    return actuals[setKey(blockIndex, setArrayIndex)] ?? targetActual(block, setArrayIndex)
}

/**
 * Save payload sets: only checked sets, with what was actually lifted.
 * setIndex is the 1-based prescription position; exerciseOrder is the 1-based block position.
 */
export function buildSetsPayload(
    blocks: RoutineBlock[],
    checkedSets: ReadonlySet<string>,
    actuals: Record<string, ActualSet>,
    rpe: number | null,
): WorkoutSetSaveRequest[] {
    return blocks.flatMap((block, blockIndex) =>
        block.prescription.flatMap((set, si) => {
            if (!checkedSets.has(setKey(blockIndex, si))) return []
            const actual = actualFor(actuals, block, blockIndex, si)
            return [
                {
                    exerciseOrder: blockIndex + 1,
                    exerciseId: block.exerciseId,
                    exerciseNameSnapshot: block.exerciseName,
                    setIndex: si + 1,
                    setType: set.setType || "working",
                    trackingMode: "weightReps",
                    weightKg: normalizeWeightKg(actual.weightKg),
                    reps: clampReps(actual.reps),
                    rir: set.targetRir ?? null,
                    rpe,
                    isFailure: actual.isFailure === true,
                    restSec: Math.min(600, Math.max(0, Math.round(set.targetRestSec ?? 0))),
                },
            ]
        }),
    )
}

/** Longest duration we record; a workout resumed days later shouldn't claim days of training. */
export const MAX_DURATION_MIN = 300

export function computeDurationMin(startedAt: number, now: number = Date.now()): number {
    const minutes = Math.round((now - startedAt) / 60_000)
    if (!Number.isFinite(minutes)) return 1
    return Math.min(MAX_DURATION_MIN, Math.max(1, minutes))
}

/** Seconds left on a rest timer (paused timers freeze at their pause moment). */
export function restRemainingSec(rest: { endsAt: number; pausedAt: number | null }, now: number = Date.now()): number {
    const reference = rest.pausedAt ?? now
    return Math.max(0, Math.ceil((rest.endsAt - reference) / 1000))
}

/** +/- seconds on a running or paused rest timer; never below "now". */
export function adjustRest(rest: { endsAt: number; pausedAt: number | null }, deltaSec: number, now: number = Date.now()) {
    const reference = rest.pausedAt ?? now
    return { ...rest, endsAt: Math.max(reference, rest.endsAt + deltaSec * 1000) }
}
