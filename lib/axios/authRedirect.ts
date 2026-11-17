/**
 * Pure helpers for auth routing: which paths are public, where to return after login,
 * and how the role cookie is written. Kept free of React so they are unit-testable.
 */
import { setAsideAccountDataForDemo } from "@/utils/accountScopedStorage"

export const RETURN_PATH_STORAGE_KEY = "fitcore_auth_return_to"
export const FAILED_WORKOUT_SAVE_KEY = "fitcore_failed_workout_save"
export const ROLE_COOKIE_NAME = "fit-core-role"
export const RETURN_PATH_PARAM = "next"

const PUBLIC_EXACT = new Set(["/", "/login", "/terms", "/privacy"])
const PUBLIC_PREFIXES = ["/oauth2", "/terms", "/privacy"]

/** Routes that render without a token. Everything else requires login. */
export function isPublicPath(pathname: string | null | undefined): boolean {
    if (!pathname) return true
    if (PUBLIC_EXACT.has(pathname)) return true
    return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
}

/** Known app sections that need login. Unknown paths are not listed so they render the 404 page. */
const PROTECTED_PREFIXES = [
    "/my",
    "/workout",
    "/nutrition",
    "/ai_routine",
    "/ai_quicklog",
    "/ai_supplement",
    "/routine",
    "/onboarding",
    "/admin",
    "/dev",
]

const matchesPrefix = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/")

/** Routes that redirect to /login without a token. Public and unknown paths (404) do not. */
export function isProtectedPath(pathname: string | null | undefined): boolean {
    if (!pathname || isPublicPath(pathname)) return false
    return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
}

/** Never sent to /onboarding: the flow itself, auth and legal pages, and the workout player. */
const ONBOARDING_EXEMPT_PREFIXES = ["/onboarding", "/login", "/oauth2", "/terms", "/privacy", "/admin", "/dev"]

/**
 * Whether the onboarding check applies on this path: home and every protected app route,
 * except the exempt flows above and the workout player (unsaved work).
 */
export function isOnboardingGuardedPath(pathname: string | null | undefined): boolean {
    if (!pathname) return false
    if (ONBOARDING_EXEMPT_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return false
    if (isUnsavedWorkPath(pathname)) return false
    return pathname === "/" || isProtectedPath(pathname)
}

/**
 * Pages holding unsaved in-memory work (the workout player). A 401 or an expired token there must
 * not log out / redirect automatically: the page keeps its payload and offers re-login itself.
 */
export function isUnsavedWorkPath(pathname: string | null | undefined): boolean {
    if (!pathname) return false
    return pathname === "/ai_routine/player" || pathname.startsWith("/ai_routine/player/")
}

/**
 * Accepts only same-origin app paths. Rejects protocol-relative ("//evil"), backslash tricks,
 * absolute URLs, and auth pages (to avoid loops). Returns null when unusable.
 */
export function sanitizeReturnPath(value: string | null | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed.startsWith("/")) return null
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) return null
    if (/[\u0000-\u001f]/.test(trimmed)) return null
    const pathOnly = trimmed.split(/[?#]/)[0]
    if (pathOnly === "/login" || pathOnly.startsWith("/login/")) return null
    if (pathOnly === "/oauth2" || pathOnly.startsWith("/oauth2/")) return null
    return trimmed
}

export function buildLoginUrl(returnPath?: string | null): string {
    const safe = sanitizeReturnPath(returnPath)
    if (!safe || safe === "/") return "/login"
    return `/login?${RETURN_PATH_PARAM}=${encodeURIComponent(safe)}`
}

/** Reads `?next=` from a search string. */
export function readReturnPathFromSearch(search: string | null | undefined): string | null {
    if (!search) return null
    try {
        return sanitizeReturnPath(new URLSearchParams(search).get(RETURN_PATH_PARAM))
    } catch {
        return null
    }
}

const MANUAL_LOGOUT_KEY = "fitcore_manual_logout"

/** The user logged out on purpose: the next login must not return to the page they left. */
export function markManualLogout(): void {
    if (typeof window === "undefined") return
    try {
        sessionStorage.setItem(MANUAL_LOGOUT_KEY, "1")
        sessionStorage.removeItem(RETURN_PATH_STORAGE_KEY)
    } catch {
        // storage blocked: worst case the next login returns to the last page
    }
}

/** True once after markManualLogout(); clears the mark. */
export function consumeManualLogout(): boolean {
    if (typeof window === "undefined") return false
    try {
        const marked = sessionStorage.getItem(MANUAL_LOGOUT_KEY) === "1"
        if (marked) sessionStorage.removeItem(MANUAL_LOGOUT_KEY)
        return marked
    } catch {
        return false
    }
}

export function rememberReturnPath(path: string | null | undefined): void {
    const safe = sanitizeReturnPath(path)
    if (!safe || typeof window === "undefined") return
    try {
        sessionStorage.setItem(RETURN_PATH_STORAGE_KEY, safe)
    } catch {
        // storage blocked: the ?next param still carries it for non-OAuth logins
    }
}

export function peekReturnPath(): string | null {
    if (typeof window === "undefined") return null
    try {
        return sanitizeReturnPath(sessionStorage.getItem(RETURN_PATH_STORAGE_KEY))
    } catch {
        return null
    }
}

/** Reads and clears the stashed return path. */
export function consumeReturnPath(): string | null {
    const value = peekReturnPath()
    if (typeof window !== "undefined") {
        try {
            sessionStorage.removeItem(RETURN_PATH_STORAGE_KEY)
        } catch {
            // ignore
        }
    }
    return value
}

/** Seconds until the JWT `exp`, clamped at 0. Null when exp is missing/invalid. */
export function cookieMaxAgeFromExp(exp: number | undefined | null, nowMs: number = Date.now()): number | null {
    if (typeof exp !== "number" || !Number.isFinite(exp)) return null
    return Math.max(0, Math.floor(exp - nowMs / 1000))
}

/** Builds the role cookie string. Persistent (Max-Age) when exp is known so it survives a browser restart. */
export function buildRoleCookie(role: string, exp?: number | null, nowMs: number = Date.now()): string {
    const maxAge = cookieMaxAgeFromExp(exp ?? undefined, nowMs)
    const safeRole = role.replace(/[;\s]/g, "")
    const base = `${ROLE_COOKIE_NAME}=${safeRole}; Path=/; SameSite=Lax`
    return maxAge === null ? base : `${base}; Max-Age=${maxAge}`
}

export const CLEAR_ROLE_COOKIE = `${ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`

/**
 * Runs `fn` (seedDemoSession on the demo login) without touching the real account's workout data.
 * seedDemoSession writes the same keys (routine, split label, condition inputs) and removes the
 * failed-save backup, so the real account's in-progress workout and backup are first moved to a
 * namespaced set-aside (utils/accountScopedStorage). The next login of that account restores them.
 * The name is kept for the login page; it no longer puts the backup back for the demo.
 */
export function preservingFailedWorkoutSave(fn: () => void): void {
    setAsideAccountDataForDemo()
    fn()
}
