import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Calendar, Clock, ChevronRight } from "lucide-react"
import { Page, WorkoutSessionResponse } from "@/types/project"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"

// ── 스켈레톤 카드 (로딩 중) ────────────────────────────────────────────────────
function WorkoutSkeleton() {
    return (
        <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
                            <div className="space-y-2">
                                <div className="h-3.5 w-28 bg-slate-200 rounded-full" />
                                <div className="h-3 w-20 bg-slate-100 rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-12 bg-slate-100 rounded-full" />
                            <div className="w-4 h-4 bg-slate-200 rounded-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Empty State (기록 없음) ────────────────────────────────────────────────────
function EmptyWorkoutState() {
    const router = useRouter()
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Dumbbell className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-700 mb-2">아직 운동 기록이 없어요!</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-xs">
                첫 번째 AI 루틴을 생성하고<br />운동을 완료하면 여기에 기록이 남아요.
            </p>
            <button
                onClick={() => router.push("/ai_routine")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-200 transition-transform active:scale-95"
            >
                <Dumbbell className="w-4 h-4" />
                첫 AI 루틴 생성하기
            </button>
        </div>
    )
}

// ── 운동 기록 카드 ─────────────────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: WorkoutSessionResponse }) {
    const dateStr = String(workout.workoutDate)
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Dumbbell className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800">
                        {(workout as any).splitLabel ?? "운동 세션"}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                        {(workout as any).durationMin && (
                            <>
                                <span className="mx-1 text-slate-200">·</span>
                                <Clock className="w-3 h-3" />
                                {(workout as any).durationMin}분
                            </>
                        )}
                    </p>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
        </div>
    )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function WorkoutList() {
    const { ref, inView } = useInView()

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery<
        Page<WorkoutSessionResponse>
    >({
        queryKey: ["recentWorkouts"],
        queryFn: async ({ pageParam = 0 }) => {
            return await workoutApiClient.getRecent(pageParam as number, 10)
        },
        getNextPageParam: (lastPage) => {
            return lastPage.last ? undefined : lastPage.number + 1
        },
        initialPageParam: 0,
    })

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage()
        }
    }, [inView, hasNextPage, fetchNextPage])

    if (status === "pending") return <WorkoutSkeleton />

    const allWorkouts = data?.pages.flatMap((page) => page.content) ?? []
    if (allWorkouts.length === 0) return <EmptyWorkoutState />

    return (
        <div className="flex flex-col gap-3 p-4">
            {allWorkouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
            ))}

            <div ref={ref} className="h-10 flex justify-center items-center text-xs text-slate-400">
                {isFetchingNextPage
                    ? <span className="animate-pulse">기록을 불러오는 중...</span>
                    : hasNextPage
                      ? "스크롤을 내려주세요"
                      : allWorkouts.length > 0
                        ? <span className="text-slate-300">— 마지막 기록입니다 —</span>
                        : null}
            </div>
        </div>
    )
}
