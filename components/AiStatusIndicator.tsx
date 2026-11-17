"use client"

import { useSyncExternalStore } from "react"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

export type AiStatus = "checking" | "up" | "limited" | "down"

const POLL_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 5_000

const STATUS_CONFIG: Record<AiStatus, { dot: string; label: string }> = {
    checking: { dot: "bg-rail", label: "AI 확인 중" },
    up: { dot: "bg-line-pull", label: "AI 정상" },
    limited: { dot: "bg-line-legs", label: "AI 제한" },
    down: { dot: "bg-danger", label: "AI 꺼짐" },
}

/** Maps the /api/ai/health body to a status. */
export function toAiStatus(ok: boolean, data: { ai?: string; llm?: string } | null | undefined): AiStatus {
    if (!ok || !data) return "down"
    if (data.ai !== "up") return "down"
    return data.llm === "up" ? "up" : "limited"
}

// ── One shared poller for every subscriber (Header, AI pages) ─────────────────
let status: AiStatus = "checking"
const listeners = new Set<() => void>()
let intervalId: ReturnType<typeof setInterval> | null = null
let abortController: AbortController | null = null

function setStatus(next: AiStatus) {
    if (next === status) return
    status = next
    listeners.forEach((listener) => listener())
}

async function check() {
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const res = await fetch(`${getBackendBaseUrl()}/api/ai/health`, {
            signal: controller.signal,
            cache: "no-store",
        })
        const data = res.ok ? await res.json() : null
        if (abortController === controller) setStatus(toAiStatus(res.ok, data))
    } catch {
        // A superseded check (aborted by a newer one) must not flip the status.
        if (abortController === controller) setStatus("down")
    } finally {
        clearTimeout(timeoutId)
    }
}

function startPolling() {
    if (intervalId !== null) return
    void check()
    intervalId = setInterval(() => void check(), POLL_INTERVAL_MS)
}

function stopPolling() {
    if (intervalId !== null) clearInterval(intervalId)
    intervalId = null
    abortController?.abort()
    abortController = null
}

function handleVisibility() {
    if (document.visibilityState === "hidden") stopPolling()
    else if (listeners.size > 0) startPolling()
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    if (listeners.size === 1) {
        document.addEventListener("visibilitychange", handleVisibility)
        if (document.visibilityState !== "hidden") startPolling()
    }
    return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
            document.removeEventListener("visibilitychange", handleVisibility)
            stopPolling()
        }
    }
}

const getSnapshot = () => status
const getServerSnapshot = (): AiStatus => "checking"

/** Current AI server status. Polls every 30s while any component uses it and the tab is visible. */
export function useAiStatus(): AiStatus {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export default function AiStatusIndicator() {
    const current = useAiStatus()
    const { dot, label } = STATUS_CONFIG[current]

    return (
        <div role="status" className="flex items-center gap-1.5" title="AI 서버 상태">
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot}`} />
            <span className="text-caption text-ink-2">{label}</span>
        </div>
    )
}
