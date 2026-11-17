import type { BodyComposition } from "@/types/project"

/**
 * Records have no id, so one is addressed by its position in the sorted list plus its measuredAt.
 * The measuredAt check catches a stale reference (the list changed under the screen).
 */
export interface BodyCompositionRef {
    index: number
    measuredAt?: string
}

/**
 * Newest first, undated records last — the same order GET /api/profile/me returns,
 * so `sorted[0]` is the latest measurement. Stable for equal dates.
 */
export function sortBodyCompositions(list: readonly BodyComposition[] | null | undefined): BodyComposition[] {
    return [...(list ?? [])].sort((a, b) => {
        const aDate = a.measuredAt ?? ""
        const bDate = b.measuredAt ?? ""
        if (aDate === bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return aDate < bDate ? 1 : -1
    })
}

function resolveIndex(sorted: BodyComposition[], ref: BodyCompositionRef): number {
    if (!Number.isInteger(ref.index) || ref.index < 0 || ref.index >= sorted.length) return -1
    return (sorted[ref.index].measuredAt ?? undefined) === (ref.measuredAt ?? undefined) ? ref.index : -1
}

/** Adds a record and returns the full sorted list to send as bodyCompositionSnapshot. */
export function addBodyComposition(list: readonly BodyComposition[] | null | undefined, record: BodyComposition): BodyComposition[] {
    return sortBodyCompositions([...(list ?? []), record])
}

/** Replaces the referenced record; null when the reference no longer matches the list. */
export function replaceBodyComposition(
    list: readonly BodyComposition[] | null | undefined,
    ref: BodyCompositionRef,
    record: BodyComposition
): BodyComposition[] | null {
    const sorted = sortBodyCompositions(list)
    const index = resolveIndex(sorted, ref)
    if (index < 0) return null
    sorted[index] = record
    return sortBodyCompositions(sorted)
}

/** Removes the referenced record (the last one yields []); null when the reference no longer matches. */
export function removeBodyComposition(
    list: readonly BodyComposition[] | null | undefined,
    ref: BodyCompositionRef
): BodyComposition[] | null {
    const sorted = sortBodyCompositions(list)
    const index = resolveIndex(sorted, ref)
    if (index < 0) return null
    sorted.splice(index, 1)
    return sorted
}
