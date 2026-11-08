"use client"

import { startTransition, useEffect, useRef, useState } from "react"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

type AiStatus = "checking" | "up" | "limited" | "down"

const POLL_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 5_000

const STATUS_CONFIG: Record<AiStatus, { dot: string; label: string }> = {
    checking: { dot: "bg-rail", label: "AI 확인 중" },
    up: { dot: "bg-line-pull", label: "AI 정상" },
    limited: { dot: "bg-line-legs", label: "AI 제한" },
    down: { dot: "bg-danger", label: "AI 꺼짐" },
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

    const { dot, label } = STATUS_CONFIG[status]

    return (
        <div role="status" className="flex items-center gap-1.5" title="AI 루틴 생성 서버 상태">
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot}`} />
            <span className="text-caption text-ink-2">{label}</span>
        </div>
    )
}
