"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, PenLine, Plus } from "lucide-react"
import { toast } from "sonner"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { clearProgramContext } from "@/utils/programContext"
import type { WorkoutSessionResponse } from "@/types/project"
import { getKstToday } from "@/utils/date"

function getWorkoutTitle(session: WorkoutSessionResponse): string {
    return (
        session.routineName?.trim() ||
        session.title?.trim() ||
        session.summaryTitle?.trim() ||
        session.splitLabel?.trim() ||
        session.targetSplitLabel?.trim() ||
        "운동 세션"
    )
}

export default function TodayWorkoutCard() {
    const router = useRouter()
    const today = getKstToday()

    const [isLoading, setIsLoading] = useState(true)
    const [sessions, setSessions] = useState<WorkoutSessionResponse[]>([])
    const [hasError, setHasError] = useState(false)
    const [isCreatingManualRoutine, setIsCreatingManualRoutine] = useState(false)
    const [showWorkoutOptions, setShowWorkoutOptions] = useState(false)

    useEffect(() => {
        workoutApiClient
            .getRecent(0, 5)
            .then((page) => setSessions(page.content ?? []))
            .catch(() => setHasError(true))
            .finally(() => setIsLoading(false))
    }, [])

    const todaySessions = useMemo(
        () => sessions.filter((s) => String(s.workoutDate).slice(0, 10) === today),
        [sessions, today]
    )

    const totalDurationMin = todaySessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0)

    const handleCreateManualRoutine = async () => {
        if (isCreatingManualRoutine) return
        setIsCreatingManualRoutine(true)
        clearProgramContext()
        try {
            const draft = await routineApiClient.createManualDraft("새 루틴")
            localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))
            router.push("/routine/draft?mode=manual")
        } catch {
            toast.error("루틴 생성에 실패했습니다.")
        } finally {
            setIsCreatingManualRoutine(false)
        }
    }

    return (
        <section>
            <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">오늘의 운동</h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                        <Dumbbell className="h-3.5 w-3.5" />
                        Workout
                    </span>
                </div>
                {!isLoading && todaySessions.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowWorkoutOptions(true)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-2xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        운동 루틴 생성
                    </button>
                )}
            </div>
            <div className="overflow-hidden rounded-[28px] border border-blue-100/80 bg-white shadow-[0_14px_36px_rgba(37,99,235,0.10)]">
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
                <div className="bg-gradient-to-br from-blue-50/80 via-white to-white p-5">
                    {isLoading ? (
                        <div className="space-y-3">
                            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                            <div className="h-11 w-full animate-pulse rounded-2xl bg-slate-100" />
                        </div>
                    ) : hasError ? (
                        <div>
                            <p className="text-sm font-bold text-slate-800">오늘 운동 정보를 불러오지 못했습니다.</p>
                            <button
                                type="button"
                                onClick={() => router.push("/workout")}
                                className="mt-3 inline-flex min-h-11 items-center rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
                            >
                                운동 페이지로
                            </button>
                        </div>
                    ) : todaySessions.length === 0 ? (
                        <div>
                            <p className="text-sm font-bold text-slate-800">아직 오늘 운동 기록이 없어요.</p>
                            <p className="mt-1 text-sm text-slate-500">
                                저장 루틴을 시작하거나 새 루틴을 만들어 보세요.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleCreateManualRoutine}
                                    disabled={isCreatingManualRoutine}
                                    className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-50"
                                >
                                    <PenLine className="h-4 w-4" />
                                    {isCreatingManualRoutine ? "만드는 중..." : "직접 루틴 만들기"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push("/ai_routine")}
                                    className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)] transition-colors hover:bg-blue-700"
                                >
                                    <Dumbbell className="h-4 w-4" />
                                    AI 루틴 만들기
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">
                                오늘 운동 완료!
                            </p>
                            {todaySessions.length === 1 ? (
                                <>
                                    <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                                        {getWorkoutTitle(todaySessions[0])}
                                    </h3>
                                    {(todaySessions[0].durationMin ?? 0) > 0 && (
                                        <p className="mt-1 text-sm text-slate-500">{todaySessions[0].durationMin}분</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                                        오늘 {todaySessions.length}회 운동
                                    </h3>
                                    {totalDurationMin > 0 && (
                                        <p className="mt-1 text-sm text-slate-500">총 {totalDurationMin}분</p>
                                    )}
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => router.push("/workout")}
                                className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
                            >
                                기록 보기
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showWorkoutOptions && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
                    onClick={() => setShowWorkoutOptions(false)}
                >
                    <div
                        className="w-full max-w-[480px] rounded-t-3xl bg-white px-5 pb-10 pt-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-900">운동 루틴 만들기</h3>
                            <button
                                type="button"
                                onClick={() => setShowWorkoutOptions(false)}
                                className="text-sm font-medium text-slate-400 hover:text-slate-600"
                            >
                                닫기
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => { setShowWorkoutOptions(false); handleCreateManualRoutine() }}
                                disabled={isCreatingManualRoutine}
                                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-50"
                            >
                                <PenLine className="h-4 w-4" />
                                {isCreatingManualRoutine ? "만드는 중..." : "직접 루틴 만들기"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowWorkoutOptions(false); router.push("/ai_routine") }}
                                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)] transition-colors hover:bg-blue-700"
                            >
                                <Dumbbell className="h-4 w-4" />
                                AI 루틴 만들기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
