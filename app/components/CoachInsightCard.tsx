"use client"

import { type LucideIcon, Apple, CheckCircle, ClipboardList, Dumbbell, Settings } from "lucide-react"
import type { CoachFocus } from "@/types/coach"
import { useCoachInsight } from "@/hooks/useCoachInsight"

const FALLBACK_MESSAGE = "오늘도 핏코어와 함께해요"

const FOCUS_ICON: Record<CoachFocus, LucideIcon> = {
    workout: Dumbbell,
    diet: Apple,
    routine: ClipboardList,
    setup: Settings,
    done: CheckCircle,
}

const OUTER = "overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-blue-600 via-indigo-500 to-emerald-400 p-[1px] shadow-[0_18px_45px_rgba(37,99,235,0.18)]"
const INNER = "relative overflow-hidden rounded-[27px] bg-white/90 px-5 py-5 backdrop-blur"

export default function CoachInsightCard() {
    const { insight, loading } = useCoachInsight()

    if (loading) {
        return (
            <div className={OUTER}>
                <div className={INNER}>
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-6 w-4/5 animate-pulse rounded bg-slate-200" />
                </div>
            </div>
        )
    }

    const message = insight?.message ?? FALLBACK_MESSAGE
    const isAlert = insight?.isAlert ?? false
    const focus = insight?.focus ?? "workout"
    const Icon = FOCUS_ICON[focus]

    return (
        <div className={OUTER}>
            <div className={INNER}>
                <Icon className="absolute -right-3 -top-3 h-24 w-24 text-blue-500 opacity-[0.07]" />
                <div className="relative">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-extrabold uppercase text-blue-600">Fit Core Today</p>
                        {isAlert && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                    </div>
                    <h1 className="mt-2 text-[20px] font-bold leading-snug text-slate-950 [word-break:keep-all]">
                        {message}
                    </h1>
                </div>
            </div>
        </div>
    )
}
