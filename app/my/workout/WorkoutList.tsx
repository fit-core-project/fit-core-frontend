import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"
import { ChevronRight, Dumbbell } from "lucide-react"
import { Page, WorkoutSessionResponse } from "@/types/project"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import WorkoutDetailModal from "@/app/my/workout/WorkoutDetailModal"
import { splitTitle } from "@/utils/displayLabels"
import { lineForRoutine } from "@/utils/routeLine"
import { EmptyState, LineBadge, Skeleton, Surface } from "@/components/ui"
import { toYmd } from "@/utils/date"

function getWorkoutTitle(workout: WorkoutSessionResponse): string {
    return (
        workout.routineName?.trim() ||
        workout.title?.trim() ||
        workout.summaryTitle?.trim() ||
        splitTitle(workout.splitLabel) ||
        splitTitle(workout.targetSplitLabel) ||
        "운동 세션"
    )
}

const formatDate = toYmd

function WorkoutSkeleton() {
    return (
        <Surface padded={false} className="flex flex-col divide-y divide-hairline" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-2 px-4 py-3.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-24" />
                </div>
            ))}
        </Surface>
    )
}

function WorkoutRow({ workout, onSelect }: { workout: WorkoutSessionResponse; onSelect: () => void }) {
    const line = lineForRoutine(workout.targetSplitLabel ?? workout.splitLabel)
    const title = getWorkoutTitle(workout)
    const setCount = (workout.sets ?? []).length

    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-[background-color] duration-150 hover:bg-surface"
        >
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                    <LineBadge line={line} className="shrink-0" />
                    <span className="truncate text-body font-bold text-ink">{title}</span>
                </span>
                <span className="mt-1 block text-body-sm text-ink-2 tabular-nums">
                    {formatDate(workout.workoutDate)}
                    {workout.durationMin ? ` · ${workout.durationMin}분` : ""}
                    {setCount > 0 ? ` · ${setCount}세트` : ""}
                </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
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
    if (allWorkouts.length === 0) {
        return (
            <Surface tone="sunken" padded={false}>
                <EmptyState
                    icon={<Dumbbell aria-hidden />}
                    title="아직 운동 기록이 없어요"
                    body="루틴으로 운동을 마치면 날짜별로 여기에 쌓여요."
                />
            </Surface>
        )
    }

    return (
        <>
            <Surface padded={false} className="overflow-hidden">
                <ul className="flex flex-col divide-y divide-hairline">
                    {allWorkouts.map((workout) => (
                        <li key={workout.id}>
                            <WorkoutRow workout={workout} onSelect={() => setSelectedWorkout(workout)} />
                        </li>
                    ))}
                </ul>
            </Surface>

            <div
                ref={ref}
                className="flex h-10 items-center justify-center text-caption text-ink-2"
                aria-busy={isFetchingNextPage || undefined}
            >
                {isFetchingNextPage ? "기록을 더 불러오는 중이에요" : hasNextPage ? "" : "마지막 기록이에요"}
            </div>

            {selectedWorkout && <WorkoutDetailModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />}
        </>
    )
}
