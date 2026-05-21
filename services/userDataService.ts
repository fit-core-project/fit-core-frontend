import { getMockUserCondition, getMockUserPreferences, UserCondition, UserPreferences } from "./mockDataFactory"
import AxiosController from "@/lib/axios/AxiosController"
import { demoUserCondition, demoUserPreferences, isDemoMode } from "@/utils/demoMode"

const IS_MOCK = process.env.NEXT_PUBLIC_DATA_SOURCE === "mock"

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getUserCondition(): Promise<UserCondition> {
    if (isDemoMode()) return demoUserCondition

    if (IS_MOCK) {
        await delay(500)
        return getMockUserCondition()
    }
    return AxiosController.get<UserCondition>("/api/users/condition")
}

export async function getUserPreferences(): Promise<UserPreferences> {
    if (isDemoMode()) return demoUserPreferences

    if (IS_MOCK) {
        await delay(500)
        return getMockUserPreferences()
    }
    return AxiosController.get<UserPreferences>("/api/users/preferences")
}
