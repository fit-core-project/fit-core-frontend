"use client"

import { useEffect, useRef, useState } from "react"

interface LogViewerProps {
    title: string
    endpoint: string | undefined
    accentClassName: string
}

export default function LogViewer({ title, endpoint, accentClassName }: LogViewerProps) {
    const [lines, setLines] = useState<string[]>([])
    const [status, setStatus] = useState<"idle" | "connected" | "error">("idle")
    const bottomRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!endpoint) {
            setStatus("error")
            setLines(["log endpoint is not configured"])
            return
        }

        let cancelled = false

        const fetchLogs = async () => {
            try {
                const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/dev/logs?limit=160`, {
                    cache: "no-store",
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                const data = (await response.json()) as unknown
                if (!Array.isArray(data)) {
                    throw new Error("invalid log response")
                }

                if (!cancelled) {
                    setLines(data.map(String))
                    setStatus("connected")
                }
            } catch (error) {
                if (!cancelled) {
                    setStatus("error")
                    setLines((prev) => [
                        ...prev.slice(-30),
                        `[log viewer] ${error instanceof Error ? error.message : "failed to fetch logs"}`,
                    ])
                }
            }
        }

        fetchLogs()
        const intervalId = window.setInterval(fetchLogs, 1500)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
        }
    }, [endpoint])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: "end" })
    }, [lines])

    return (
        <aside className="hidden h-full min-w-0 flex-1 flex-col overflow-hidden border-slate-800 bg-slate-950 text-slate-100 lg:flex">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-4">
                <div className="min-w-0">
                    <h2 className="truncate font-mono text-xs font-bold uppercase tracking-wide text-slate-200">
                        {title}
                    </h2>
                    <p className="font-mono text-[10px] text-slate-500">{endpoint || "not configured"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <span
                        className={`h-2 w-2 rounded-full ${
                            status === "connected"
                                ? accentClassName
                                : status === "error"
                                  ? "bg-rose-500"
                                  : "bg-slate-600"
                        }`}
                    />
                    <span className="font-mono text-[10px] uppercase text-slate-500">{status}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 font-mono text-[11px] leading-relaxed">
                {lines.length === 0 ? (
                    <p className="text-slate-500">waiting for logs...</p>
                ) : (
                    lines.map((line, index) => (
                        <div key={`${index}-${line}`} className="whitespace-pre-wrap break-words text-slate-300">
                            {line}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </aside>
    )
}
