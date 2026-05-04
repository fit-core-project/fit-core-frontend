import { getMockExerciseCatalog, getMockRecentRecord, ExerciseCatalogItem, RecentRecord } from "./mockDataFactory"
import AxiosController from "@/lib/axios/AxiosController"

const IS_MOCK = process.env.NEXT_PUBLIC_DATA_SOURCE === "mock"

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
    if (IS_MOCK) {
        await delay(500)
        return getMockExerciseCatalog()
    }
    return AxiosController.get<ExerciseCatalogItem[]>("/api/exercises/catalog")
}

export async function getRecentRecord(exerciseId: string): Promise<RecentRecord | null> {
    if (IS_MOCK) {
        await delay(300)
        return getMockRecentRecord(exerciseId)
    }
    try {
        return await AxiosController.get<RecentRecord>(`/api/exercises/${exerciseId}/recent-record`)
    } catch (err: any) {
        if (err.response?.status === 404) return null
        throw err
    }
}
