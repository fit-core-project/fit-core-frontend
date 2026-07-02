import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, ChevronRight, Clock, Dumbbell } from "lucide-react"
import { Page, WorkoutSessionResponse } from "@/types/project"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import WorkoutDetailModal from "@/app/my/workout/WorkoutDetailModal"

type WorkoutTitleSource = WorkoutSessionResponse & {
    routineName?: string | null
    title?: string | null
    summaryTitle?: string | null
    targetSplitLabel?: string | null
}

function getWorkoutTitle(workout: WorkoutTitleSource): string {
    return (
        workout.routineName?.trim() ||
        workout.title?.trim() ||
        workout.summaryTitle?.trim() ||
        workout.splitLabel?.trim() ||
        workout.targetSplitLabel?.trim() ||
        "운동 세션"
    )
}

function formatDate(value: string | Date): string {
    return typeof value === "string" ? value : value.toISOString().split("T")[0]
}

function WorkoutSkeleton() {
    return (
        <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200" />
                            <div className="space-y-2">
                                <div className="h-3.5 w-28 rounded-full bg-slate-200" />
                                <div className="h-3 w-20 rounded-full bg-slate-100" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-12 rounded-full bg-slate-100" />
                            <div className="h-4 w-4 rounded-full bg-slate-200" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function EmptyWorkoutState() {
    const router = useRouter()

    return (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                <Dumbbell className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="mb-2 text-lg font-extrabold text-slate-700">아직 운동 기록이 없습니다</h3>
            <p className="mb-8 max-w-xs text-sm leading-relaxed text-slate-400">
                AI 루틴을 생성하고 운동을 완료하면 이곳에 기록이 쌓입니다.
            </p>
            <button
                type="button"
                onClick={() => router.push("/ai_routine")}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition-transform hover:bg-blue-700 active:scale-95"
            >
                <Dumbbell className="h-4 w-4" />
                AI 운동 루틴 만들기
            </button>
        </div>
    )
}

function WorkoutCard({ workout, onSelect }: { workout: WorkoutSessionResponse; onSelect: () => void }) {
    const dateStr = formatDate(workout.workoutDate)
    const title = getWorkoutTitle(workout)

    return (
        <button
            type="button"
            onClick={onSelect}
            className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 transition-colors group-hover:bg-blue-100">
                    <Dumbbell className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                        {workout.durationMin ? (
                            <>
                                <span className="mx-1 text-slate-200">·</span>
                                <Clock className="h-3 w-3" />
                                {workout.durationMin}분
                            </>
                        ) : null}
                    </p>
                </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-400" />
        </button>
    )
}

export default function WorkoutList() {
    const { ref, inView } = useInView()
    const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSessionResponse | null>(null)

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
        <>
            <div className="flex flex-col gap-3 p-4">
                {allWorkouts.map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} onSelect={() => setSelectedWorkout(workout)} />
                ))}

                <div ref={ref} className="flex h-10 items-center justify-center text-xs text-slate-400">
                    {isFetchingNextPage ? (
                        <span className="animate-pulse">기록을 불러오는 중...</span>
                    ) : hasNextPage ? (
                        "스크롤을 내려주세요"
                    ) : allWorkouts.length > 0 ? (
                        <span className="text-slate-300">마지막 기록입니다</span>
                    ) : null}
                </div>
            </div>

            {selectedWorkout && (
                <WorkoutDetailModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />
            )}
        </>
    )
}
