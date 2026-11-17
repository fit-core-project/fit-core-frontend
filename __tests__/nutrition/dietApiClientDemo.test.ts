import { afterEach, beforeEach, describe, expect, it } from "vitest"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import { DEMO_DIETS_STORAGE_KEY, DEMO_MODE_STORAGE_KEY } from "@/utils/demoMode"
import type { DietLogRequest, DietLogResponse } from "@/types/project"

function installStorage() {
    const store = new Map<string, string>()
    const localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
    }
    ;(globalThis as unknown as { window: unknown }).window = { localStorage }
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = localStorage
    return localStorage
}

const req = (patch: Partial<DietLogRequest>): DietLogRequest =>
    ({
        logDate: "2026-11-17",
        mealType: "lunch",
        loggedAt: null,
        foodName: "잡곡밥",
        amountG: null,
        amountRaw: null,
        proteinG: 20,
        carbsG: 30,
        fatG: null,
        kcal: null,
        source: "db",
        ...patch,
    }) as DietLogRequest

describe("dietApiClient demo mode", () => {
    beforeEach(() => {
        const ls = installStorage()
        ls.setItem(DEMO_MODE_STORAGE_KEY, "true")
        ls.setItem(DEMO_DIETS_STORAGE_KEY, "[]")
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
        delete (globalThis as { localStorage?: unknown }).localStorage
    })

    it("db row with kcal null saves the macro kcal the preview shows (P1-4)", async () => {
        const [saved] = await dietApiClient.save([req({ kcal: null })])
        expect(saved.kcal).toBe(20 * 4 + 30 * 4)
    })

    it("edit turns the row manual like BE (P2-12)", async () => {
        const [saved] = await dietApiClient.save([req({ kcal: 300 })])
        expect(saved.source).toBe("db")
        const updated = await dietApiClient.update(saved.id, req({ foodName: "현미밥", kcal: 280 }))
        expect(updated.source).toBe("manual")
        expect(updated.kcal).toBe(280)
        const stored = JSON.parse(localStorage.getItem(DEMO_DIETS_STORAGE_KEY) ?? "[]") as DietLogResponse[]
        expect(stored.find((l) => l.id === saved.id)?.source).toBe("manual")
    })
})
