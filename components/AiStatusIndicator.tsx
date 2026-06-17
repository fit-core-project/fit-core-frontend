"use client"

import { startTransition, useEffect, useRef, useState } from "react"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

type AiStatus = "checking" | "up" | "limited" | "down"

const POLL_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 5_000

const STATUS_CONFIG: Record<AiStatus, { dot: string; label: string; glow: string }> = {
    checking: { dot: "bg-slate-400",   label: "확인 중",  glow: "" },
    up:       { dot: "bg-emerald-500", label: "AI 정상",  glow: "shadow-[0_0_4px_1px_rgba(16,185,129,0.5)]" },
    limited:  { dot: "bg-amber-400",   label: "AI 제한",  glow: "shadow-[0_0_4px_1px_rgba(251,191,36,0.5)]" },
    down:     { dot: "bg-red-500",     label: "AI 꺼짐",  glow: "" },
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
                let next: AiStatus = "down"
                if (data.ai === "up") {
                    next = data.llm === "up" ? "up" : "limited"
                }
                startTransition(() => setStatus(next))
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

    const { dot, label, glow } = STATUS_CONFIG[status]

    return (
        <div
            className="flex items-center gap-1.5"
            aria-label={`AI 서버 상태: ${label}`}
            title={label}
        >
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${dot} ${glow}`}
            />
            <span className="hidden text-xs font-medium text-slate-500 sm:block">
                {label}
            </span>
        </div>
    )
}
