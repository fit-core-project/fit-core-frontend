/**
 * Merges soreness loaded from the saved condition into what the user has already tapped on this screen.
 * Any muscle the user touched keeps the user's value, including "removed" (no entry); loaded values only
 * fill muscles the user never touched. This stops a retried load from resurrecting soreness the user cleared.
 */
export function mergeLoadedDoms(
    loaded: Readonly<Record<string, number>>,
    current: Readonly<Record<string, number>>,
    touched: ReadonlySet<string>,
): Record<string, number> {
    const merged: Record<string, number> = {}
    for (const [muscle, level] of Object.entries(loaded)) {
        if (!touched.has(muscle)) merged[muscle] = level
    }
    return { ...merged, ...current }
}
