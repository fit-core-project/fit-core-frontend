import type { BodyComposition } from "@/types/project"

export const KG_TO_LBS = 2.20462

/** Converted weights are stored with two decimals (176.4 lb -> 80.01 kg, not 80.01378922…). */
export function roundKg(kg: number): number {
    return Math.round(kg * 100) / 100
}

export const WEIGHT_KG_FIELDS = ["bodyWeightKg", "skeletalMuscleMassKg", "bodyFatMassKg", "fatFreeMassKg"] as const satisfies readonly (keyof BodyComposition)[]

/** Form prefill in the display unit: weights in lbs are rounded to one decimal. */
export function toDisplayValues(record: BodyComposition, unit: "kg" | "lbs"): Partial<BodyComposition> {
    const display: Partial<BodyComposition> = { ...record }
    if (unit === "lbs") {
        for (const field of WEIGHT_KG_FIELDS) {
            const val = record[field]
            if (val != null) display[field] = Number((val * KG_TO_LBS).toFixed(1))
        }
    }
    return display
}

/**
 * Converts form values (display unit) back to kg. When editing, a weight the user left untouched
 * keeps its stored kg value instead of drifting through the lbs rounding.
 */
export function toStoredValues(
    formData: Partial<BodyComposition>,
    unit: "kg" | "lbs",
    initial?: { stored: BodyComposition; display: Partial<BodyComposition> }
): BodyComposition {
    const converted = { ...formData } as BodyComposition
    if (unit !== "lbs") return converted
    for (const field of WEIGHT_KG_FIELDS) {
        const val = converted[field]
        if (val == null) continue
        const storedVal = initial?.stored[field]
        converted[field] = storedVal != null && val === initial?.display[field] ? storedVal : roundKg(val / KG_TO_LBS)
    }
    return converted
}
