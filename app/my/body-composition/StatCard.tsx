import React from "react"

interface StatCardProps {
    label: string
    value: string
    unit: string
    /** Kept for API compatibility; body metrics have no good/bad colour, so it is not applied. */
    color?: string
    icon: React.ReactNode
    diff: {
        text: string
        value?: string
        type: "up" | "down" | "none"
    }
}

/**
 * One latest-measurement figure. Up/down is shown with a neutral arrow: for weight or fat,
 * "up" is not automatically good or bad, so no green/red judgement.
 */
export default function StatCard({ label, value, unit, icon, diff }: StatCardProps) {
    return (
        <div className="flex flex-col gap-1 rounded-panel border border-hairline bg-ground px-3 py-3">
            <div className="flex items-center gap-1.5 text-ink-2">
                <span className="size-4 shrink-0 [&_svg]:size-4" aria-hidden>
                    {icon}
                </span>
                <span className="truncate text-caption font-medium">{label}</span>
            </div>

            <p className="flex items-baseline">
                <span className="text-title-sm font-bold tabular-nums text-ink">{value}</span>
                <span className="ml-0.5 text-caption font-medium text-ink-2">{unit}</span>
            </p>

            <p className="flex items-center gap-0.5 text-caption tabular-nums text-ink-2">
                {diff.type === "up" && <span aria-hidden>▲</span>}
                {diff.type === "down" && <span aria-hidden>▼</span>}
                <span>{diff.value ? `${diff.value} ${diff.text}` : diff.text}</span>
            </p>
        </div>
    )
}
