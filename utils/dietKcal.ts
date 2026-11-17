export const PROTEIN_KCAL_PER_G = 4
export const CARBS_KCAL_PER_G = 4
export const FAT_KCAL_PER_G = 9

export type DietSource = "db" | "ai" | "manual"

export function hasAnyMacro(proteinG?: number | null, carbsG?: number | null, fatG?: number | null): boolean {
    return proteinG != null || carbsG != null || fatG != null
}

/** 4·4·9 kcal from macros, rounded like the backend. */
export function calcMacroKcal(proteinG?: number | null, carbsG?: number | null, fatG?: number | null): number {
    const total = (proteinG ?? 0) * PROTEIN_KCAL_PER_G + (carbsG ?? 0) * CARBS_KCAL_PER_G + (fatG ?? 0) * FAT_KCAL_PER_G
    return Math.round(total)
}

interface KcalInput {
    source: DietSource | string
    kcal?: number | null
    proteinG?: number | null
    carbsG?: number | null
    fatG?: number | null
}

/**
 * The kcal value the client should put on the wire for a row.
 * - ai: null (BE always uses macros)
 * - kcal is rounded first: BE `Integer` would truncate 315.6 to 315.
 * - db with a rounded kcal <= 0: null, so BE falls back to macros exactly like the preview.
 */
export function kcalToSend(source: DietSource | string, kcal?: number | null): number | null {
    if (source === "ai" || kcal == null || !Number.isFinite(kcal)) return null
    const rounded = Math.round(kcal)
    if (source === "db" && rounded <= 0) return null
    return rounded
}

/**
 * Mirrors BE DietLogService.resolveKcal so previews match what gets saved.
 * - ai: always macros (a sent kcal is ignored)
 * - db: kcal when > 0, else macros
 * - manual: kcal when given, else macros
 * kcal is normalised with `kcalToSend` first, the same value the request carries.
 * Returns null when the backend would reject the item (nothing to compute kcal from).
 */
export function resolveDietKcal(req: KcalInput): number | null {
    const macros = hasAnyMacro(req.proteinG, req.carbsG, req.fatG)
    const fromMacros = macros ? calcMacroKcal(req.proteinG, req.carbsG, req.fatG) : null
    const sent = kcalToSend(req.source, req.kcal)
    return sent != null ? sent : fromMacros
}
