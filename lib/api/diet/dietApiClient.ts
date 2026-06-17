import AxiosController from "@/lib/axios/AxiosController"
import type { DietLogRequest, DietLogResponse, DietSummaryResponse } from "@/types/project"
import { DEMO_DIETS_STORAGE_KEY, deleteDemoDiet, getDemoDietSummary, isDemoMode, updateDemoDiet } from "@/utils/demoMode"

const PROTEIN_KCAL = 4
const CARBS_KCAL = 4
const FAT_KCAL = 9

function calcMacroKcal(proteinG?: number | null, carbsG?: number | null, fatG?: number | null): number {
    return Math.round((proteinG ?? 0) * PROTEIN_KCAL + (carbsG ?? 0) * CARBS_KCAL + (fatG ?? 0) * FAT_KCAL)
}

function readDemoDiets(): DietLogResponse[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(DEMO_DIETS_STORAGE_KEY)
        return raw ? (JSON.parse(raw) as DietLogResponse[]) : []
    } catch {
        return []
    }
}

function writeDemoDiets(logs: DietLogResponse[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(DEMO_DIETS_STORAGE_KEY, JSON.stringify(logs))
}

function getKstDate(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const dietApiClient = {
    save: (items: DietLogRequest[]): Promise<DietLogResponse[]> => {
        if (isDemoMode()) {
            const stored = readDemoDiets()
            const newItems: DietLogResponse[] = items.map((req) => {
                const kcal =
                    req.source !== "ai" && req.kcal != null
                        ? req.kcal
                        : calcMacroKcal(req.proteinG, req.carbsG, req.fatG)
                const loggedAt = req.loggedAt ? `${req.logDate}T${req.loggedAt}:00` : null
                return {
                    id: `demo-diet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    logDate: req.logDate,
                    mealType: req.mealType ?? null,
                    loggedAt,
                    foodName: req.foodName,
                    amountG: req.amountG ?? null,
                    amountRaw: req.amountRaw ?? null,
                    kcal,
                    proteinG: req.proteinG ?? null,
                    carbsG: req.carbsG ?? null,
                    fatG: req.fatG ?? null,
                    source: req.source,
                }
            })
            writeDemoDiets([...newItems, ...stored])
            return Promise.resolve(newItems)
        }
        return AxiosController.post<DietLogResponse[]>("/api/diet-logs", items)
    },

    update: (id: string, req: DietLogRequest): Promise<DietLogResponse> => {
        if (isDemoMode()) {
            const stored = readDemoDiets()
            const existing = stored.find((l) => l.id === id)
            if (!existing) return Promise.reject(new Error("Not found"))
            const kcal = req.kcal != null ? req.kcal : calcMacroKcal(req.proteinG, req.carbsG, req.fatG)
            const loggedAt = req.loggedAt ? `${existing.logDate}T${req.loggedAt}:00` : null
            const updated: DietLogResponse = {
                ...existing,
                mealType: req.mealType ?? null,
                loggedAt,
                foodName: req.foodName,
                amountG: req.amountG ?? null,
                amountRaw: req.amountRaw ?? null,
                kcal,
                proteinG: req.proteinG ?? null,
                carbsG: req.carbsG ?? null,
                fatG: req.fatG ?? null,
                source: "manual",
            }
            updateDemoDiet(id, updated)
            return Promise.resolve(updated)
        }
        return AxiosController.put<DietLogResponse>(`/api/diet-logs/${id}`, req)
    },

    delete: (id: string): Promise<void> => {
        if (isDemoMode()) {
            deleteDemoDiet(id)
            return Promise.resolve()
        }
        return AxiosController.delete<void>(`/api/diet-logs/${id}`)
    },

    getSummary: (date: string): Promise<DietSummaryResponse> =>
        isDemoMode()
            ? Promise.resolve(getDemoDietSummary(date))
            : AxiosController.get<DietSummaryResponse>(`/api/diet-logs/summary?date=${date}`),

    getToday: (): Promise<DietSummaryResponse> => dietApiClient.getSummary(getKstDate()),
}

export default dietApiClient
