import type { FieldValues, RegisterOptions } from "react-hook-form"

export type NumericFieldName =
    | "weightKg"
    | "reps"
    | "restSec"
    | "bodyWeightKg"
    | "bodyFatPct"
    | "skeletalMuscleMassKg"
    | "workingWeightKg"

type NumericRange = {
    min: number
    max: number
    step: number
    integer?: boolean
    message: string
}

export const NUMERIC_RANGES: Record<NumericFieldName, NumericRange> = {
    weightKg: { min: 0.1, max: 500, step: 0.5, message: "중량은 0kg 초과 500kg 이하로 입력해 주세요." },
    workingWeightKg: { min: 0.1, max: 500, step: 0.5, message: "중량은 0kg 초과 500kg 이하로 입력해 주세요." },
    reps: { min: 1, max: 50, step: 1, integer: true, message: "반복 횟수는 1회 이상 50회 이하의 정수로 입력해 주세요." },
    restSec: { min: 0, max: 600, step: 1, integer: true, message: "휴식 시간은 0초 이상 600초 이하의 정수로 입력해 주세요." },
    bodyWeightKg: { min: 20, max: 300, step: 0.1, message: "체중은 20kg 이상 300kg 이하로 입력해 주세요." },
    bodyFatPct: { min: 1, max: 60, step: 0.1, message: "체지방률은 1% 이상 60% 이하로 입력해 주세요." },
    skeletalMuscleMassKg: { min: 5, max: 100, step: 0.1, message: "골격근량은 5kg 이상 100kg 이하로 입력해 주세요." },
}

const KG_TO_LBS = 2.20462

export function toDisplayBound(value: number, unit: "kg" | "lbs") {
    return unit === "lbs" ? Number((value * KG_TO_LBS).toFixed(1)) : value
}

export function displayToKg(value: number, unit: "kg" | "lbs") {
    return unit === "lbs" ? value / KG_TO_LBS : value
}

export function validateNumericRange(
    field: NumericFieldName,
    value: unknown,
    unit: "kg" | "lbs" = "kg"
): true | string {
    if (value === "" || value === null || value === undefined) return true

    const numericValue = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(numericValue)) return NUMERIC_RANGES[field].message

    const range = NUMERIC_RANGES[field]
    const normalized =
        unit === "lbs" && ["weightKg", "workingWeightKg", "bodyWeightKg", "skeletalMuscleMassKg"].includes(field)
            ? displayToKg(numericValue, unit)
            : numericValue

    if (range.integer && !Number.isInteger(numericValue)) return range.message
    return normalized >= range.min && normalized <= range.max ? true : range.message
}

export function numericRules<TFieldValues extends FieldValues = FieldValues>(
    field: NumericFieldName,
    unit: "kg" | "lbs" = "kg"
): RegisterOptions<TFieldValues> {
    return {
        validate: (value) => validateNumericRange(field, value, unit),
    }
}
