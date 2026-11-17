import AxiosController from "@/lib/axios/AxiosController"
import type { DietDailyAggregationResponse, DietLogRequest, DietLogResponse, DietSummaryResponse } from "@/types/project"
import {
    DEMO_DIETS_STORAGE_KEY,
    deleteDemoDiet,
    getDemoDailySummary,
    getDemoDietSummary,
    isDemoMode,
    updateDemoDiet,
} from "@/utils/demoMode"
import { getKstToday } from "@/utils/date"
import { calcMacroKcal, resolveDietKcal } from "@/utils/dietKcal"

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

const dietApiClient = {
    save: (items: DietLogRequest[]): Promise<DietLogResponse[]> => {
        if (isDemoMode()) {
            const stored = readDemoDiets()
            const newItems: DietLogResponse[] = items.map((req) => {
                // Same rule as BE DietLogService.resolveKcal.
                const kcal = resolveDietKcal(req) ?? 0
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
            // BE update: typed kcal wins, otherwise 4·4·9 from macros.
            const kcal = req.kcal != null ? Math.round(req.kcal) : calcMacroKcal(req.proteinG, req.carbsG, req.fatG)
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
                // Same as BE DietLogService.update: any edit makes the row "manual".
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

    getToday: (): Promise<DietSummaryResponse> => dietApiClient.getSummary(getKstToday()),

    getDailySummary: (from: string, to: string): Promise<DietDailyAggregationResponse[]> =>
        isDemoMode()
            ? Promise.resolve(getDemoDailySummary(from, to))
            : AxiosController.get<DietDailyAggregationResponse[]>(`/api/diet-logs/daily-summary?from=${from}&to=${to}`),
}

export default dietApiClient
