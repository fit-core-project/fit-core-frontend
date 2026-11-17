import { afterEach, describe, expect, it, vi } from "vitest"
import { jwtDecode } from "jwt-decode"
import { createDemoToken, demoRole, isDemoAdminEnabled } from "@/utils/demoMode"
import { isDemoLoginEnabled } from "@/utils/demoLoginFlag"

afterEach(() => vi.unstubAllEnvs())

describe("demo admin flag", () => {
    it("defaults to ROLE_USER", () => {
        vi.stubEnv("NEXT_PUBLIC_DEMO_ADMIN", "")
        expect(isDemoAdminEnabled()).toBe(false)
        expect(jwtDecode<{ auth: string; demo: boolean }>(createDemoToken())).toMatchObject({ auth: "ROLE_USER", demo: true })
    })

    it("grants ROLE_ADMIN only for exactly \"true\"", () => {
        vi.stubEnv("NEXT_PUBLIC_DEMO_ADMIN", "true")
        expect(jwtDecode<{ auth: string }>(createDemoToken()).auth).toBe("ROLE_ADMIN")
        expect(isDemoAdminEnabled("TRUE")).toBe(false)
        expect(isDemoAdminEnabled("1")).toBe(false)
        expect(demoRole(false)).toBe("ROLE_USER")
    })
})

describe("demo login flag", () => {
    it.each([
        ["true", "production", true],
        ["false", "development", false],
        [undefined, "production", false],
        ["", "production", false],
        [undefined, "development", true],
        [undefined, "test", true],
    ] as const)("flag=%s env=%s -> %s", (flag, nodeEnv, expected) => {
        expect(isDemoLoginEnabled(flag, nodeEnv)).toBe(expected)
    })
})
