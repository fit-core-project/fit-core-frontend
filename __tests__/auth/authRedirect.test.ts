import { describe, expect, it } from "vitest"
import {
    buildLoginUrl,
    buildRoleCookie,
    cookieMaxAgeFromExp,
    isOnboardingGuardedPath,
    isProtectedPath,
    isPublicPath,
    isUnsavedWorkPath,
    readReturnPathFromSearch,
    sanitizeReturnPath,
} from "@/lib/axios/authRedirect"

describe("isPublicPath", () => {
    it.each(["/", "/login", "/oauth2/redirect", "/terms", "/privacy", "/terms/v2"])("%s is public", (p) => {
        expect(isPublicPath(p)).toBe(true)
    })
    it.each(["/my", "/workout", "/ai_routine/player", "/admin", "/nutrition", "/loginx", "/termsheet"])(
        "%s is protected",
        (p) => {
            expect(isPublicPath(p)).toBe(false)
        },
    )
})

describe("sanitizeReturnPath", () => {
    it("keeps app paths with query", () => {
        expect(sanitizeReturnPath("/my?tab=stats")).toBe("/my?tab=stats")
        expect(sanitizeReturnPath("/admin/exercises")).toBe("/admin/exercises")
    })
    it.each([null, "", "my", "//evil.com", "/\\evil.com", "https://evil.com/x", "/login", "/login?next=/my", "/oauth2/redirect"])(
        "rejects %s",
        (v) => {
            expect(sanitizeReturnPath(v)).toBeNull()
        },
    )
})

describe("buildLoginUrl / readReturnPathFromSearch", () => {
    it("round-trips the return path", () => {
        const url = buildLoginUrl("/my?tab=stats")
        expect(url).toBe("/login?next=%2Fmy%3Ftab%3Dstats")
        expect(readReturnPathFromSearch(url.slice("/login".length))).toBe("/my?tab=stats")
    })
    it("drops unsafe or root paths", () => {
        expect(buildLoginUrl("//evil.com")).toBe("/login")
        expect(buildLoginUrl("/")).toBe("/login")
        expect(readReturnPathFromSearch("?next=https://evil.com")).toBeNull()
    })
})

describe("role cookie", () => {
    const now = 1_700_000_000_000
    it("computes max-age from exp", () => {
        expect(cookieMaxAgeFromExp(now / 1000 + 3600, now)).toBe(3600)
        expect(cookieMaxAgeFromExp(now / 1000 - 10, now)).toBe(0)
        expect(cookieMaxAgeFromExp(undefined, now)).toBeNull()
    })
    it("is persistent when exp is known", () => {
        expect(buildRoleCookie("ROLE_ADMIN", now / 1000 + 60, now)).toBe(
            "fit-core-role=ROLE_ADMIN; Path=/; SameSite=Lax; Max-Age=60",
        )
        expect(buildRoleCookie("ROLE_USER")).toBe("fit-core-role=ROLE_USER; Path=/; SameSite=Lax")
    })
    it("strips cookie separators from the role", () => {
        expect(buildRoleCookie("ROLE_USER; Path=/x")).toBe("fit-core-role=ROLE_USERPath=/x; Path=/; SameSite=Lax")
    })
})

describe("isUnsavedWorkPath", () => {
    it("covers only the workout player", () => {
        expect(isUnsavedWorkPath("/ai_routine/player")).toBe(true)
        expect(isUnsavedWorkPath("/ai_routine/player/x")).toBe(true)
        expect(isUnsavedWorkPath("/ai_routine")).toBe(false)
        expect(isUnsavedWorkPath("/ai_routine/playerx")).toBe(false)
    })
})

describe("isProtectedPath", () => {
    it.each(["/my", "/my/settings", "/workout", "/workout/programs/1", "/ai_routine/player", "/nutrition", "/routine/draft", "/onboarding", "/admin"])(
        "%s requires login",
        (p) => {
            expect(isProtectedPath(p)).toBe(true)
        },
    )
    it.each(["/", "/login", "/terms", "/privacy", "/oauth2/redirect", "/does-not-exist", "/myx", "/workouts", null])(
        "%s does not redirect to login",
        (p) => {
            expect(isProtectedPath(p)).toBe(false)
        },
    )
})

describe("isOnboardingGuardedPath", () => {
    it.each(["/", "/my", "/workout", "/nutrition", "/ai_routine", "/ai_quicklog", "/ai_supplement", "/routine/draft"])("%s is guarded", (p) => {
        expect(isOnboardingGuardedPath(p)).toBe(true)
    })
    it.each(["/onboarding", "/login", "/oauth2/redirect", "/terms", "/privacy", "/ai_routine/player", "/admin", "/does-not-exist", null])(
        "%s is exempt",
        (p) => {
            expect(isOnboardingGuardedPath(p)).toBe(false)
        },
    )
})
