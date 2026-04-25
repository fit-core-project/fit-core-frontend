import { getMockExerciseCatalog, getMockRecentRecord, ExerciseCatalogItem, RecentRecord } from "./mockDataFactory"

const IS_MOCK = process.env.NEXT_PUBLIC_DATA_SOURCE === "mock"

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
    if (IS_MOCK) {
        await delay(500)
        return getMockExerciseCatalog()
    }
    const res = await fetch("/api/exercises/catalog")
    if (!res.ok) throw new Error(`getExerciseCatalog failed: ${res.status}`)
    return res.json()
}

export async function getRecentRecord(exerciseId: string): Promise<RecentRecord | null> {
    if (IS_MOCK) {
        await delay(300)
        return getMockRecentRecord(exerciseId)
    }
    const res = await fetch(`/api/exercises/${exerciseId}/recent-record`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`getRecentRecord failed: ${res.status}`)
    return res.json()
}
