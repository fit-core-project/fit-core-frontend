import { describe, expect, it } from "vitest"
import {
    LEGACY_ONBOARDING_DONE_KEY,
    clearOnboardingFlags,
    isOnboardingDone,
    isProfileOnboarded,
    markOnboardingDone,
    onboardingFlagKey,
} from "@/lib/api/profile/onboardingFlag"

function memoryStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial))
    return {
        get length() {
            return map.size
        },
        key: (i: number) => Array.from(map.keys())[i] ?? null,
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
        dump: () => Object.fromEntries(map),
    }
}

describe("onboardingFlag", () => {
    it("keys the flag per account", () => {
        const storage = memoryStorage()
        markOnboardingDone("A@fitcore.com", storage)
        expect(isOnboardingDone("a@fitcore.com", storage)).toBe(true)
        expect(isOnboardingDone("b@fitcore.com", storage)).toBe(false)
        expect(storage.getItem(onboardingFlagKey("a@fitcore.com"))).toBe("1")
    })

    it("ignores the legacy global key and removes it on mark", () => {
        const storage = memoryStorage({ [LEGACY_ONBOARDING_DONE_KEY]: "1" })
        expect(isOnboardingDone("a@fitcore.com", storage)).toBe(false)
        markOnboardingDone("a@fitcore.com", storage)
        expect(storage.getItem(LEGACY_ONBOARDING_DONE_KEY)).toBeNull()
    })

    it("returns false without an account id", () => {
        const storage = memoryStorage()
        markOnboardingDone(undefined, storage)
        expect(storage.length).toBe(0)
        expect(isOnboardingDone(null, storage)).toBe(false)
    })

    it("clears every account flag and the legacy key, keeping other keys", () => {
        const storage = memoryStorage({
            [LEGACY_ONBOARDING_DONE_KEY]: "1",
            [onboardingFlagKey("a@x.com")]: "1",
            [onboardingFlagKey("b@x.com")]: "1",
            "auth-storage": "{}",
        })
        clearOnboardingFlags(storage)
        expect(storage.dump()).toEqual({ "auth-storage": "{}" })
    })

    it("requires both nickname and goalType", () => {
        expect(isProfileOnboarded({ nickname: "헬린이", goalType: "strength" })).toBe(true)
        expect(isProfileOnboarded({ nickname: "  ", goalType: "strength" })).toBe(false)
        expect(isProfileOnboarded({ nickname: "헬린이", goalType: undefined as never })).toBe(false)
        expect(isProfileOnboarded(null)).toBe(false)
    })
})
