"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronDown, Dumbbell, Play } from "lucide-react"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { RoutineFinalResponse, RoutineDraft } from "@/types/routine"

const SPLIT_LABELS: Record<string, string> = {
    push: "푸시",
    pull: "풀",
    legs: "레그",
    upper: "상체",
    lower: "하체",
    full: "전신",
    custom: "커스텀",
}

function splitLabel(label: string) {
    return SPLIT_LABELS[label?.toLowerCase()] ?? label ?? "루틴"
}

function RoutineCard({ routine, onPlay }: { routine: RoutineFinalResponse; onPlay: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const blocks = routine.finalRoutinePayload?.routineBlocks ?? []
    const isFallback = routine.finalRoutinePayload?.fallback === true
    const date = routine.targetWorkoutDate
        ? new Date(routine.targetWorkoutDate).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : null

    return (
        <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4">
                <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                    {splitLabel(routine.targetSplitLabel)}
                </span>
                {isFallback && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                        <AlertCircle className="h-3 w-3" />
                        기본 루틴
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                        {routine.finalRoutinePayload?.summaryTitle || splitLabel(routine.targetSplitLabel)}
                    </p>
                    {date && <p className="text-xs text-slate-400">{date}</p>}
                </div>
                <button
                    type="button"
                    onClick={onPlay}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"
                    aria-label="다시 시작"
                >
                    <Play size={14} fill="white" />
                </button>
            </div>

            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500"
            >
                <span>{blocks.length}개 종목</span>
                <ChevronDown
                    size={14}
                    className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                />
            </button>

            {expanded && (
                <ul className="divide-y divide-slate-50 px-4 pb-3">
                    {blocks.map((block) => (
                        <li key={block.order} className="flex items-center gap-2 py-2">
                            <span className="w-4 shrink-0 text-center text-xs text-slate-400">
                                {block.order}
                            </span>
                            <span className="flex-1 text-sm text-slate-700">{block.exerciseName}</span>
                            <span className="text-xs text-slate-400">
                                {block.prescription?.length ?? 0}세트
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default function Routine() {
    const router = useRouter()
    const [routines, setRoutines] = useState<RoutineFinalResponse[]>([])
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    useEffect(() => {
        routineApiClient
            .getMyFinals(0, 20)
            .then((res) => {
                setRoutines(res.content)
                setHasMore(!res.last)
                setPage(0)
            })
            .catch(() => setRoutines([]))
            .finally(() => setLoading(false))
    }, [])

    const loadMore = () => {
        const next = page + 1
        setLoadingMore(true)
        routineApiClient
            .getMyFinals(next, 20)
            .then((res) => {
                setRoutines((prev) => [...prev, ...res.content])
                setHasMore(!res.last)
                setPage(next)
            })
            .finally(() => setLoadingMore(false))
    }

    const handlePlay = (routine: RoutineFinalResponse) => {
        const payload = routine.finalRoutinePayload
        const draft: RoutineDraft = {
            routineDraftId: routine.routineDraftId,
            generationStatus: payload.generationStatus,
            statusReasonCode: payload.statusReasonCode,
            isFallback: payload.fallback,
            totalEstimatedTime: payload.totalEstimatedTime,
            summaryTitle: payload.summaryTitle,
            rationaleSummary: payload.rationaleSummary ?? [],
            warnings: payload.warnings ?? [],
            routineBlocks: payload.routineBlocks,
        }
        localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))
        localStorage.setItem("fitcore_routine_final_id", routine.routineFinalId)
        router.push("/ai_routine/player")
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
                ))}
            </div>
        )
    }

    if (routines.length === 0) {
        return (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Dumbbell className="h-8 w-8" />
                </div>
                <h2 className="mb-2 text-lg font-extrabold text-slate-800">저장된 루틴이 없습니다</h2>
                <p className="max-w-xs text-sm leading-relaxed text-slate-500">
                    AI 운동 루틴 만들기에서 루틴을 만들고 확정하면 이곳에서 확인할 수 있습니다.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {routines.map((r) => (
                <RoutineCard key={r.routineFinalId} routine={r} onPlay={() => handlePlay(r)} />
            ))}
            {hasMore && (
                <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-slate-500 shadow-sm disabled:opacity-50"
                >
                    {loadingMore ? "불러오는 중..." : "더 보기"}
                </button>
            )}
        </div>
    )
}
