import { getRecentRecord } from "@/services/exerciseService"
import type { RecentRecord } from "@/services/mockDataFactory"
import { isDemoMode } from "@/utils/demoMode"

const cache = new Map<string, Promise<RecentRecord | null>>()

/**
 * Last recorded set for an exercise, fetched once per exercise per page load.
 * Any failure resolves to null (the hint is optional). Skipped in demo mode: there is no backend,
 * and a 401 would make the axios interceptor log the user out mid-workout.
 */
export function getCachedRecentRecord(exerciseId: string): Promise<RecentRecord | null> {
    if (!exerciseId || isDemoMode()) return Promise.resolve(null)
    const hit = cache.get(exerciseId)
    if (hit) return hit
    const request = getRecentRecord(exerciseId).catch(() => null)
    cache.set(exerciseId, request)
    return request
}

export function clearRecentRecordCache(): void {
    cache.clear()
}
