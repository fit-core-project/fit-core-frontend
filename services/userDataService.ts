import { getMockUserCondition, getMockUserPreferences, UserCondition, UserPreferences } from "./mockDataFactory"

const IS_MOCK = process.env.NEXT_PUBLIC_DATA_SOURCE === "mock"

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getUserCondition(): Promise<UserCondition> {
    if (IS_MOCK) {
        await delay(500)
        return getMockUserCondition()
    }
    const res = await fetch("/api/users/condition")
    if (!res.ok) throw new Error(`getUserCondition failed: ${res.status}`)
    return res.json()
}

export async function getUserPreferences(): Promise<UserPreferences> {
    if (IS_MOCK) {
        await delay(500)
        return getMockUserPreferences()
    }
    const res = await fetch("/api/users/preferences")
    if (!res.ok) throw new Error(`getUserPreferences failed: ${res.status}`)
    return res.json()
}
