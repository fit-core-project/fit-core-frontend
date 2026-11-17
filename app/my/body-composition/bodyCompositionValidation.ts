import type { BodyComposition } from "@/types/project"

const KG_TO_LBS = 2.20462

/** Ranges for the body-composition fields not covered by utils/numericValidation. Mirrors BE BodyComposition DTO. */
export const BODY_COMPOSITION_RANGES = {
    bodyFatMassKg: { min: 0.5, max: 200, step: 0.1, weight: true, message: "체지방량은 0.5kg 이상 200kg 이하로 입력해 주세요." },
    fatFreeMassKg: { min: 10, max: 250, step: 0.1, weight: true, message: "제지방량은 10kg 이상 250kg 이하로 입력해 주세요." },
    visceralFatLevel: { min: 1, max: 30, step: 1, integer: true, message: "내장지방 레벨은 1 이상 30 이하의 정수로 입력해 주세요." },
    waistHipRatio: { min: 0.4, max: 1.5, step: 0.01, message: "허리엉덩이비율은 0.4 이상 1.5 이하로 입력해 주세요." },
} as const

export type ExtraRangeField = keyof typeof BODY_COMPOSITION_RANGES

export const MEASUREMENT_FIELDS = [
    "bodyWeightKg",
    "skeletalMuscleMassKg",
    "bodyFatMassKg",
    "bodyFatPct",
    "fatFreeMassKg",
    "visceralFatLevel",
    "waistHipRatio",
] as const satisfies readonly (keyof BodyComposition)[]

export type BodyCompositionErrors = Partial<Record<"measuredAt" | "measurements" | ExtraRangeField, string>>

const isBlank = (value: unknown) => value === undefined || value === null || value === "" || (typeof value === "number" && Number.isNaN(value))

export function toKstDateString(now: Date = new Date()): string {
    return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Converts a displayed weight bound to the active unit (for input min/max hints). */
export function displayBound(value: number, unit: "kg" | "lbs"): number {
    return unit === "lbs" ? Number((value * KG_TO_LBS).toFixed(1)) : value
}

export function validateExtraRange(field: ExtraRangeField, value: unknown, unit: "kg" | "lbs" = "kg"): string | undefined {
    if (isBlank(value)) return undefined
    const range = BODY_COMPOSITION_RANGES[field]
    const numeric = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(numeric)) return range.message
    if ("integer" in range && range.integer && !Number.isInteger(numeric)) return range.message
    const normalized = "weight" in range && range.weight && unit === "lbs" ? numeric / KG_TO_LBS : numeric
    return normalized >= range.min && normalized <= range.max ? undefined : range.message
}

/**
 * Form-level checks for a new body-composition record (values in the display unit).
 * measuredAt is required (YYYY-MM-DD, not in the future) and at least one measurement must be filled.
 */
export function validateBodyComposition(
    data: Partial<BodyComposition>,
    unit: "kg" | "lbs" = "kg",
    today: string = toKstDateString()
): BodyCompositionErrors {
    const errors: BodyCompositionErrors = {}

    const measuredAt = data.measuredAt?.trim()
    if (!measuredAt) {
        errors.measuredAt = "측정일을 입력해 주세요."
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredAt) || Number.isNaN(Date.parse(`${measuredAt}T00:00:00Z`))) {
        errors.measuredAt = "측정일을 올바른 날짜로 입력해 주세요."
    } else if (measuredAt > today) {
        errors.measuredAt = "측정일은 오늘 이후로 정할 수 없어요."
    }

    if (MEASUREMENT_FIELDS.every((field) => isBlank(data[field]))) {
        errors.measurements = "체중, 골격근량, 체지방률 등 측정값을 하나 이상 입력해 주세요."
    }

    for (const field of Object.keys(BODY_COMPOSITION_RANGES) as ExtraRangeField[]) {
        const message = validateExtraRange(field, data[field], unit)
        if (message) errors[field] = message
    }

    return errors
}

export const hasBodyCompositionErrors = (errors: BodyCompositionErrors) => Object.keys(errors).length > 0
