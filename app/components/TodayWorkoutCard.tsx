"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, PenLine } from "lucide-react"
import { toast } from "sonner"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import type { WorkoutSessionResponse } from "@/types/project"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

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
            <h2 className="text-lg font-bold text-slate-800 mb-3 px-1">오늘 운동</h2>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
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
                            className="mt-3 inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
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
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleCreateManualRoutine}
                                disabled={isCreatingManualRoutine}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                                <PenLine className="h-4 w-4" />
                                {isCreatingManualRoutine ? "만드는 중..." : "직접 루틴 만들기"}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push("/ai_routine")}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                            >
                                <Dumbbell className="h-4 w-4" />
                                AI 루틴 만들기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold text-blue-600">오늘 운동 완료!</p>
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
        </section>
    )
}
