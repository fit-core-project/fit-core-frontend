import type { RoutineBlock } from "@/types/routine"
import { NUMERIC_RANGES, validateNumericRange } from "@/utils/numericValidation"

export type WeightUnit = "kg" | "lbs"

const KG_TO_LBS = 2.20462

const round1 = (value: number) => Math.round(value * 10) / 10

/**
 * The model always stores kg with one decimal. 1 lbs is ~0.45 kg, so a 0.1 kg grid keeps every whole-lbs
 * value distinguishable and rounding the display back to whole lbs recovers exactly what was typed.
 */
export function displayToStoredKg(value: number, unit: WeightUnit): number {
    return round1(unit === "lbs" ? value / KG_TO_LBS : value)
}

/** View-only conversion. The stored kg is never re-rounded by this; only the shown number is. */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
    return unit === "lbs" ? Math.round(kg * KG_TO_LBS) : kg
}

/** Bodyweight (null or 0) shows as an empty field so the "맨몸" placeholder appears. */
export function formatWeight(kg: number | null, unit: WeightUnit): string {
    return kg === null || kg <= 0 ? "" : String(kgToDisplay(kg, unit))
}

export type SetField = "weight" | "reps" | "rest"

/**
 * Draft weight rule, matching the player: empty or 0 means bodyweight (stored as null), otherwise up to 500kg.
 * Kept local so the shared NUMERIC_RANGES (onboarding working weight etc.) are not loosened.
 */
export const DRAFT_WEIGHT_MAX_KG = NUMERIC_RANGES.weightKg.max
export const DRAFT_WEIGHT_MESSAGE = `무게는 0~${DRAFT_WEIGHT_MAX_KG}kg로 입력해 주세요. 0이나 빈칸은 맨몸이에요.`

export type ParsedSetInput = { ok: true; value: number | null } | { ok: false; message: string }

/**
 * Parses what the user typed into a set field. Weight may be empty or 0 (bodyweight = null); reps and rest may not.
 * Weight comes back as stored kg.
 */
export function parseSetInput(field: SetField, raw: string, unit: WeightUnit = "kg"): ParsedSetInput {
    const text = raw.trim()
    if (field === "weight") {
        if (text === "") return { ok: true, value: null }
        const num = Number(text)
        if (!Number.isFinite(num) || num < 0) return { ok: false, message: DRAFT_WEIGHT_MESSAGE }
        const kg = displayToStoredKg(num, unit)
        if (kg === 0) return { ok: true, value: null }
        return kg <= DRAFT_WEIGHT_MAX_KG ? { ok: true, value: kg } : { ok: false, message: DRAFT_WEIGHT_MESSAGE }
    }
    const name = field === "reps" ? "reps" : "restSec"
    if (text === "") return { ok: false, message: NUMERIC_RANGES[name].message }
    const num = Number(text)
    const verdict = validateNumericRange(name, num)
    return verdict === true ? { ok: true, value: num } : { ok: false, message: verdict }
}

export type DraftInvalidReason = "noExercises" | "emptyExercise" | "noSets" | "setOutOfRange"

/** Why a routine cannot be saved, or null when it can. Applies to AI and manual routines alike. */
export function draftInvalidReason(blocks: readonly RoutineBlock[]): DraftInvalidReason | null {
    if (blocks.length === 0) return "noExercises"
    if (blocks.some((block) => !block.exerciseId || block.exerciseId.trim() === "")) return "emptyExercise"
    if (blocks.some((block) => block.prescription.length === 0)) return "noSets"
    const inRange = blocks.every((block) =>
        block.prescription.every(
            (s) =>
                Number.isInteger(s.targetReps) &&
                s.targetReps >= NUMERIC_RANGES.reps.min &&
                s.targetReps <= NUMERIC_RANGES.reps.max &&
                // 0 is bodyweight, like null (the player treats <= 0 as 맨몸).
                (s.targetWeightKg === null || (s.targetWeightKg >= 0 && s.targetWeightKg <= DRAFT_WEIGHT_MAX_KG)) &&
                s.targetRestSec >= NUMERIC_RANGES.restSec.min &&
                s.targetRestSec <= NUMERIC_RANGES.restSec.max,
        ),
    )
    return inRange ? null : "setOutOfRange"
}

export const DRAFT_INVALID_MESSAGE: Record<DraftInvalidReason, string> = {
    noExercises: "운동을 하나 이상 추가해야 저장할 수 있어요.",
    emptyExercise: "운동을 고르지 않은 칸이 있어요. 운동을 고르거나 빼 주세요.",
    noSets: "세트가 없는 운동이 있어요. 세트를 추가하세요.",
    setOutOfRange: `세트 값을 확인하세요. 횟수 ${NUMERIC_RANGES.reps.min}~${NUMERIC_RANGES.reps.max}회, 무게 0~${DRAFT_WEIGHT_MAX_KG}kg(0은 맨몸), 휴식 ${NUMERIC_RANGES.restSec.min}~${NUMERIC_RANGES.restSec.max}초 안이어야 해요.`,
}
