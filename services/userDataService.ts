import { getMockUserCondition, getMockUserPreferences, UserCondition, UserPainProfile, UserPreferences } from "./mockDataFactory"
import AxiosController from "@/lib/axios/AxiosController"
import { computeDemoCondition, demoUserPreferences, getDemoProfile, isDemoMode } from "@/utils/demoMode"

const IS_MOCK = process.env.NEXT_PUBLIC_DATA_SOURCE === "mock"

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

type BeConditionResponse = {
    painAreas: string[]
    doms: Array<{ bodyPart: string; level: string; recordedAt: string | null }>
}

function levelToInt(level: string): 1 | 2 {
    return level === "moderate" ? 2 : 1
}

function parseBeCondition(raw: BeConditionResponse): UserCondition {
    return {
        painAreas: raw.painAreas,
        doms: Object.fromEntries(
            raw.doms.map((d) => [d.bodyPart, levelToInt(d.level)])
        ) as Partial<Record<string, 1 | 2>>,
    }
}

export async function getUserCondition(): Promise<UserCondition> {
    if (isDemoMode()) return computeDemoCondition()

    if (IS_MOCK) {
        await delay(500)
        return getMockUserCondition()
    }

    const raw = await AxiosController.get<BeConditionResponse>("/api/users/condition")
    return parseBeCondition(raw)
}

export async function getUserPainProfile(): Promise<UserPainProfile> {
    if (isDemoMode()) return { painAreas: getDemoProfile().painAreas.map((p) => p.area) }

    if (IS_MOCK) {
        await delay(500)
        return { painAreas: getMockUserCondition().painAreas }
    }
    return AxiosController.get<UserPainProfile>("/api/users/condition")
}

export async function getUserPreferences(): Promise<UserPreferences> {
    if (isDemoMode()) return demoUserPreferences

    if (IS_MOCK) {
        await delay(500)
        return getMockUserPreferences()
    }
    return AxiosController.get<UserPreferences>("/api/users/preferences")
}
