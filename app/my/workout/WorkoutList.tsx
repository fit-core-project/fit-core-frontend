import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import { Page, WorkoutSessionResponse } from "@/types/project"
import WorkoutService from "@/lib/api/workout/WorkoutService"

export default function WorkoutList() {
    const { ref, inView } = useInView()

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery<
        Page<WorkoutSessionResponse>
    >({
        queryKey: ["recentWorkouts"],
        queryFn: async ({ pageParam = 0 }) => {
            return await WorkoutService.getRecentWorkouts(pageParam as number, 10)
        },
        getNextPageParam: (lastPage) => {
            // 2. lastPage는 이제 PageResponse 타입이므로 타입 안정성이 보장됩니다.
            // 서버 응답의 last 필드가 true가 아니면 현재 페이지(number) + 1을 반환
            return lastPage.last ? undefined : lastPage.number + 1
        },
        initialPageParam: 0,
    })

    // 스크롤이 바닥(ref)에 닿으면 다음 페이지 호출
    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage()
        }
    }, [inView, hasNextPage, fetchNextPage])

    if (status === "pending") return <div>로딩 중...</div>

    return (
        <div className="flex flex-col gap-4 p-4">
            {data?.pages.map((page) =>
                page.content.map((workout: WorkoutSessionResponse) => (
                    <div key={workout.id} className="p-4 border rounded-lg shadow-sm">
                        <h3 className="font-bold">{String(workout.workoutDate)}</h3>
                    </div>
                ))
            )}

            {/* 이 div가 화면에 보이면 다음 데이터를 불러옵니다 */}
            <div ref={ref} className="h-10 flex justify-center items-center">
                {isFetchingNextPage
                    ? "데이터를 더 불러오는 중..."
                    : hasNextPage
                      ? "스크롤을 내려주세요"
                      : "마지막 기록입니다."}
            </div>
        </div>
    )
}
