"use client"

import { startTransition, useEffect, useRef, useState } from "react"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

type AiStatus = "checking" | "up" | "down"

const POLL_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 5_000

const STATUS_CONFIG: Record<AiStatus, { dot: string; label: string }> = {
    checking: { dot: "bg-slate-400", label: "확인 중" },
    up:       { dot: "bg-emerald-500", label: "AI 정상" },
    down:     { dot: "bg-red-500",     label: "AI 꺼짐" },
}

export default function AiStatusIndicator() {
    const [status, setStatus] = useState<AiStatus>("checking")
    const abortRef = useRef<AbortController | null>(null)

    const check = async () => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/ai/health`, {
                signal: controller.signal,
                cache: "no-store",
            })
            clearTimeout(timeoutId)
            if (res.ok) {
                const data = await res.json()
                startTransition(() => setStatus(data.ai === "up" ? "up" : "down"))
            } else {
                startTransition(() => setStatus("down"))
            }
        } catch {
            clearTimeout(timeoutId)
            startTransition(() => setStatus("down"))
        }
    }

    useEffect(() => {
        check()
        const id = setInterval(check, POLL_INTERVAL_MS)
        return () => {
            clearInterval(id)
            abortRef.current?.abort()
        }
    }, [])

    const { dot, label } = STATUS_CONFIG[status]

    return (
        <div
            className="flex items-center gap-1.5"
            aria-label={`AI 서버 상태: ${label}`}
            title={label}
        >
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${dot} ${status === "up" ? "shadow-[0_0_4px_1px_rgba(16,185,129,0.5)]" : ""}`}
            />
            <span className="hidden text-xs font-medium text-slate-500 sm:block">
                {label}
            </span>
        </div>
    )
}
