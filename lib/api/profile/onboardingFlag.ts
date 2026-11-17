import type { UserResponse } from "@/types/project"

/** Pre-2026-11 key shared by every account on the device. Removed whenever the flag is touched. */
export const LEGACY_ONBOARDING_DONE_KEY = "fitcore_onboarding_done"
const ONBOARDING_DONE_PREFIX = "fitcore_onboarding_done:"

type FlagStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

function defaultStorage(): FlagStorage | null {
    if (typeof window === "undefined") return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

/** Per-account key; the JWT subject (email) identifies the account. */
export function onboardingFlagKey(accountId: string): string {
    return `${ONBOARDING_DONE_PREFIX}${accountId.trim().toLowerCase()}`
}

export function isOnboardingDone(accountId: string | null | undefined, storage: FlagStorage | null = defaultStorage()): boolean {
    if (!accountId || !storage) return false
    try {
        return storage.getItem(onboardingFlagKey(accountId)) === "1"
    } catch {
        return false
    }
}

export function markOnboardingDone(accountId: string | null | undefined, storage: FlagStorage | null = defaultStorage()): void {
    if (!accountId || !storage) return
    try {
        storage.removeItem(LEGACY_ONBOARDING_DONE_KEY)
        storage.setItem(onboardingFlagKey(accountId), "1")
    } catch {
        // Storage can be unavailable (private mode); the guard then falls back to the profile check.
    }
}

/** Clears every account's flag plus the legacy key. Called on logout and withdrawal. */
export function clearOnboardingFlags(storage: FlagStorage | null = defaultStorage()): void {
    if (!storage) return
    try {
        const keys: string[] = []
        for (let i = 0; i < storage.length; i += 1) {
            const key = storage.key(i)
            if (key && (key === LEGACY_ONBOARDING_DONE_KEY || key.startsWith(ONBOARDING_DONE_PREFIX))) keys.push(key)
        }
        keys.forEach((key) => storage.removeItem(key))
    } catch {
        // ignore
    }
}

/** Onboarding is complete only when the profile has both a nickname and a goal. */
export function isProfileOnboarded(profile: Pick<UserResponse, "nickname" | "goalType"> | null | undefined): boolean {
    return Boolean(profile?.nickname?.trim()) && Boolean(profile?.goalType)
}
