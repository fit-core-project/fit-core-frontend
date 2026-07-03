"use client"

import { useCoachInsight } from "@/hooks/useCoachInsight"

const FALLBACK_MESSAGE = "오늘도 핏코어와 함께해요"

export default function CoachInsightCard() {
    const { insight, loading } = useCoachInsight()

    const shell = (body: React.ReactNode) => (
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-blue-600 via-indigo-500 to-emerald-400 p-[1px] shadow-[0_18px_45px_rgba(37,99,235,0.18)]">
            <div className="rounded-[27px] bg-white/90 px-5 py-5 backdrop-blur">
                {body}
            </div>
        </div>
    )

    if (loading) {
        return shell(
            <div>
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-7 w-4/5 animate-pulse rounded bg-slate-200" />
            </div>
        )
    }

    const message = insight?.message ?? FALLBACK_MESSAGE
    const isAlert = insight?.isAlert ?? false

    return shell(
        <div>
            <p className="text-[11px] font-extrabold uppercase text-blue-600">Fit Core Today</p>
            {isAlert && (
                <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                    주의
                </span>
            )}
            <h1 className={`text-[25px] font-extrabold leading-tight text-slate-950 ${isAlert ? "mt-1" : "mt-2"}`}>
                {message}
            </h1>
        </div>
    )
}
