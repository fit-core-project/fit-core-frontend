"use client"

import Link from "next/link"
import { ChevronRight, MessageCircle } from "lucide-react"
import { useCoachInsight } from "@/hooks/useCoachInsight"
import { Skeleton } from "@/components/ui"

const FALLBACK_MESSAGE = "오늘도 핏코어와 함께해요"

/** A single coaching line above the day's route: no card chrome, the sentence is the content. */
export default function CoachInsightCard() {
    const { insight, loading } = useCoachInsight()

    if (loading) {
        return (
            <div className="flex flex-col gap-2" aria-busy="true">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-4/5" />
            </div>
        )
    }

    const message = insight?.message ?? FALLBACK_MESSAGE
    const isAlert = insight?.isAlert ?? false
    const showAction = insight?.showAction === true && insight?.action

    return (
        <aside aria-label="코치 한마디" className="flex gap-3">
            <MessageCircle className={`mt-0.5 size-5 shrink-0 ${isAlert ? "text-danger" : "text-ink-2"}`} aria-hidden />
            <div className="min-w-0">
                <p className={`text-body font-medium ${isAlert ? "text-danger-ink" : "text-ink"}`}>{message}</p>
                {insight?.description && <p className="mt-1 text-body-sm text-ink-2">{insight.description}</p>}
                {showAction && (
                    <Link
                        href={insight!.action!.href}
                        className="mt-1 inline-flex min-h-11 items-center gap-0.5 text-body-sm font-bold text-ink underline-offset-2 hover:underline"
                    >
                        {insight!.action!.label}
                        <ChevronRight className="size-4" aria-hidden />
                    </Link>
                )}
            </div>
        </aside>
    )
}
