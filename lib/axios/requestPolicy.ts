import axios, { type AxiosRequestConfig } from "axios"

/** Default for ordinary API calls. */
export const DEFAULT_TIMEOUT_MS = 30_000
/** AI calls (routine generation, parse-diet, supplement chat, STT) are slow by nature. */
export const AI_TIMEOUT_MS = 90_000

const AI_PATH_PATTERNS: RegExp[] = [/^\/api\/ai\//, /^\/api\/routines\/generate(?:[/?#]|$)/]

/** Strips scheme/host and a configured baseURL so matching works on the API path only. */
export function toApiPath(url: string | undefined | null): string {
    if (!url) return ""
    try {
        if (/^https?:\/\//i.test(url)) return new URL(url).pathname
    } catch {
        // fall through
    }
    return url.startsWith("/") ? url : `/${url}`
}

export function isAiRequestUrl(url: string | undefined | null): boolean {
    const path = toApiPath(url)
    return AI_PATH_PATTERNS.some((re) => re.test(path))
}

/**
 * Picks the timeout for a request. An explicit positive per-request timeout wins;
 * otherwise AI endpoints get AI_TIMEOUT_MS and everything else DEFAULT_TIMEOUT_MS.
 */
export function timeoutFor(url: string | undefined | null, explicitTimeout?: number | null): number {
    if (typeof explicitTimeout === "number" && explicitTimeout > 0) return explicitTimeout
    return isAiRequestUrl(url) ? AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
}

/** True for the workout save call (POST /api/workouts) whose 401 must not hard-redirect. */
export function isWorkoutSaveRequest(method: string | undefined | null, url: string | undefined | null): boolean {
    if ((method ?? "").toLowerCase() !== "post") return false
    const path = toApiPath(url).split(/[?#]/)[0].replace(/\/+$/, "")
    return path === "/api/workouts"
}

/**
 * Per-request config for AI calls: longer timeout plus an optional AbortSignal.
 * Usage: AxiosController.post(url, body, aiRequestConfig({ signal: controller.signal }))
 */
export function aiRequestConfig<D = unknown>(config: AxiosRequestConfig<D> = {}): AxiosRequestConfig<D> {
    return { ...config, timeout: config.timeout && config.timeout > 0 ? config.timeout : AI_TIMEOUT_MS }
}

/** Creates an AbortController for a cancellable request (pass `.signal` in the axios config). */
export function createRequestController(): AbortController {
    return new AbortController()
}

/** The request was cancelled by an AbortController (user pressed cancel or page left). */
export function isCanceledError(error: unknown): boolean {
    if (axios.isCancel(error)) return true
    const e = error as { code?: string; name?: string } | null
    return e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError"
}

/** The request hit the client timeout. */
export function isTimeoutError(error: unknown): boolean {
    const e = error as { code?: string } | null
    return e?.code === "ECONNABORTED" || e?.code === "ETIMEDOUT"
}

/** Marker set on 401 errors so callers (e.g. the workout player) can offer re-login. */
export const AUTH_EXPIRED_FLAG = "fitcoreAuthExpired"

export function isAuthExpiredError(error: unknown): boolean {
    const e = error as ({ response?: { status?: number } } & Record<string, unknown>) | null
    return Boolean(e && (e[AUTH_EXPIRED_FLAG] === true || e.response?.status === 401))
}
