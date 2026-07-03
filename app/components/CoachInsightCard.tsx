"use client"

import Link from "next/link"
import { useCoachInsight } from "@/hooks/useCoachInsight"
import type { CoachFocus } from "@/types/coach"

const ACTION_CLASS: Record<CoachFocus, string> = {
    workout: "bg-blue-600 hover:bg-blue-700 text-white",
    diet: "bg-emerald-600 hover:bg-emerald-700 text-white",
    routine: "bg-violet-600 hover:bg-violet-700 text-white",
    setup: "bg-slate-700 hover:bg-slate-800 text-white",
    done: "bg-emerald-600 hover:bg-emerald-700 text-white",
}

export default function CoachInsightCard() {
    const { insight, loading } = useCoachInsight()

    if (loading) {
        return (
            <section>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 mb-2" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="mt-4 h-11 w-36 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            </section>
        )
    }

    if (!insight) return null

    const { isAlert, message, action, focus } = insight

    return (
        <section>
            <div
                className={`p-5 rounded-3xl shadow-sm border ${
                    isAlert ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"
                }`}
            >
                <p
                    className={`text-sm font-semibold leading-relaxed ${
                        isAlert ? "text-amber-900" : "text-slate-800"
                    }`}
                >
                    {message}
                </p>
                <div className="mt-4">
                    <Link
                        href={action.href}
                        className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                            isAlert
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : (ACTION_CLASS[focus] ?? "bg-slate-700 hover:bg-slate-800 text-white")
                        }`}
                    >
                        {action.label}
                    </Link>
                </div>
            </div>
        </section>
    )
}
