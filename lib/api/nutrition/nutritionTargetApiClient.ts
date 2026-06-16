import AxiosController from "@/lib/axios/AxiosController"
import type { NutritionTarget } from "@/types/project"
import { DEMO_NUTRITION_TARGET_STORAGE_KEY, demoNutritionTarget, isDemoMode } from "@/utils/demoMode"

function readDemoTarget(): NutritionTarget {
    if (typeof window === "undefined") return demoNutritionTarget
    try {
        const raw = localStorage.getItem(DEMO_NUTRITION_TARGET_STORAGE_KEY)
        return raw ? (JSON.parse(raw) as NutritionTarget) : demoNutritionTarget
    } catch {
        return demoNutritionTarget
    }
}

const nutritionTargetApiClient = {
    getTarget: async (): Promise<NutritionTarget | null> => {
        if (isDemoMode()) return readDemoTarget()
        // 204 → response.data === "" via interceptor → treat as null (미설정)
        const data = await AxiosController.get<NutritionTarget | null>("/api/nutrition-targets/me")
        return data || null
    },

    saveTarget: async (req: NutritionTarget): Promise<NutritionTarget> => {
        if (isDemoMode()) {
            if (typeof window !== "undefined") {
                localStorage.setItem(DEMO_NUTRITION_TARGET_STORAGE_KEY, JSON.stringify(req))
            }
            return req
        }
        return AxiosController.put<NutritionTarget>("/api/nutrition-targets/me", req)
    },
}

export default nutritionTargetApiClient
