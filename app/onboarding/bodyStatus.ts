import type { BodyComposition, PainArea, UserResponse, UserUpdateRequest } from "@/types/project"
import { validateNumericRange } from "@/utils/numericValidation"

/**
 * Pain-area answer on the "몸 상태" step.
 * - null: not answered → the PUT omits painAreas, so the stored value is kept (BE merge: null keeps).
 * - []: "없어요" → the PUT sends [] and clears the stored list.
 * - [...slugs]: the selected SSOT slugs replace the stored list.
 */
export type PainSelection = string[] | null

/** Toggling one slug. Choosing a part leaves "없어요"; removing the last part means "없어요" again. */
export function togglePainArea(selection: PainSelection, slug: string): string[] {
    const current = selection ?? []
    return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
}

/** Prefill from the stored profile: a saved list is shown as selected; an empty or missing list stays unanswered. */
export function initialPainSelection(profile: Pick<UserResponse, "painAreas"> | null | undefined): PainSelection {
    const areas = profile?.painAreas ?? []
    return areas.length > 0 ? areas.map((item) => item.area) : null
}

/** Selected slugs as PainArea entries, keeping the note the user already saved (My page) for a part that stays selected. */
export function buildPainAreas(selection: string[], stored: readonly PainArea[] | null | undefined): PainArea[] {
    const notes = new Map((stored ?? []).map((item) => [item.area, item.note ?? ""]))
    return selection.map((area) => ({ area, note: notes.get(area) ?? "" }))
}

export type WeightParse = { ok: true; value: number | null } | { ok: false; message: string }

/** Empty input is "not entered". Otherwise the value must be in the bodyWeightKg range (kg), rounded to 0.1. */
export function parseBodyWeight(raw: string): WeightParse {
    const trimmed = raw.trim()
    if (trimmed === "") return { ok: true, value: null }
    const result = validateNumericRange("bodyWeightKg", trimmed, "kg")
    if (result !== true) return { ok: false, message: result }
    return { ok: true, value: Math.round(Number(trimmed) * 10) / 10 }
}

/**
 * Snapshot list with today's weight. PUT replaces the whole list when it is sent, so this always starts from the
 * full stored list. A same-day entry is updated in place (going back and saving again must not add a second one)
 * and keeps its other measurements. Newest first, like the BE response.
 */
export function withTodayWeight(stored: readonly BodyComposition[] | null | undefined, weightKg: number, today: string): BodyComposition[] {
    const list = [...(stored ?? [])]
    const index = list.findIndex((item) => item.measuredAt === today)
    if (index >= 0) {
        list[index] = { ...list[index], bodyWeightKg: weightKg }
    } else {
        list.push({ measuredAt: today, source: "manual", bodyWeightKg: weightKg })
    }
    return list.sort((a, b) => (b.measuredAt ?? "").localeCompare(a.measuredAt ?? ""))
}

/**
 * Partial PUT body for the step, or null when there is nothing to save.
 * The snapshot list is only sent when the stored profile was loaded; without it, sending [today] would wipe the history.
 */
export function buildBodyStatusUpdate(input: {
    painSelection: PainSelection
    weightKg: number | null
    profile: Pick<UserResponse, "painAreas" | "bodyCompositionSnapshot"> | null
    today: string
}): UserUpdateRequest | null {
    const { painSelection, weightKg, profile, today } = input
    const request: UserUpdateRequest = {}
    if (painSelection !== null) {
        request.painAreas = buildPainAreas(painSelection, profile?.painAreas)
    }
    if (weightKg !== null) {
        request.bodyWeightKg = weightKg
        if (profile) {
            request.bodyCompositionSnapshot = withTodayWeight(profile.bodyCompositionSnapshot, weightKg, today)
        }
    }
    return Object.keys(request).length > 0 ? request : null
}
