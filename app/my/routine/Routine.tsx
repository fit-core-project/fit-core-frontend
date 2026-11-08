"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Play } from "lucide-react"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { RoutineFinalResponse } from "@/types/routine"
import { routineOriginLabel, splitLabel, splitTitle } from "@/utils/displayLabels"
import { lineForRoutine } from "@/utils/routeLine"
import { prepareFinalRoutineForPlay } from "@/utils/routinePlay"
import { Button, EmptyState, LineBadge, Notice, RouteStrip, Skeleton, Surface, Tag } from "@/components/ui"

const MAX_STOPS = 5

function RoutineCard({ routine, onPlay }: { routine: RoutineFinalResponse; onPlay: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const blocks = routine.finalRoutinePayload?.routineBlocks ?? []
    const isFallback = routine.finalRoutinePayload?.fallback === true
    const line = lineForRoutine(routine.targetSplitLabel, blocks.flatMap((b) => b.primaryMuscles ?? []))
    const title = routine.finalRoutinePayload?.summaryTitle?.trim() || splitTitle(routine.targetSplitLabel) || splitLabel(routine.targetSplitLabel)
    const names = blocks.map((b) => b.exerciseName || "운동")
    const stops = names.length > MAX_STOPS ? [...names.slice(0, MAX_STOPS - 1), `외 ${names.length - MAX_STOPS + 1}개`] : names
    const listId = `routine-${routine.routineFinalId}-blocks`
    const date = routine.targetWorkoutDate
        ? new Date(routine.targetWorkoutDate).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : null

    return (
        <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <LineBadge line={line} />
                        {isFallback && <Tag>{routineOriginLabel({ isFallback })}</Tag>}
                    </div>
                    <p className="mt-1.5 truncate text-body font-bold text-ink">{title}</p>
                    <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                        {blocks.length}개 운동
                        {date ? ` · ${date}` : ""}
                    </p>
                </div>
                <Button variant="primary" line={line} icon={<Play className="size-4" aria-hidden />} onClick={onPlay} aria-label={`${title} 출발하기`}>
                    출발
                </Button>
            </div>

            {stops.length > 0 && <RouteStrip line={line} label={`${title} 노선`} stops={stops} />}

            {blocks.length > 0 && (
                <>
                    <Button
                        variant="ghost"
                        className="-mx-2 self-start"
                        aria-expanded={expanded}
                        aria-controls={listId}
                        onClick={() => setExpanded((v) => !v)}
                        icon={
                            <ChevronDown
                                className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                                aria-hidden
                            />
                        }
                    >
                        {expanded ? "운동 목록 접기" : "운동 목록 보기"}
                    </Button>
                    {expanded && (
                        <ol id={listId} className="flex flex-col divide-y divide-hairline border-y border-hairline">
                            {blocks.map((block) => (
                                <li key={block.order} className="flex min-h-11 items-center gap-3 text-body-sm">
                                    <span className="w-5 shrink-0 text-center text-ink-2 tabular-nums">{block.order}</span>
                                    <span className="min-w-0 flex-1 truncate text-ink">{block.exerciseName}</span>
                                    <span className="shrink-0 text-ink-2 tabular-nums">{block.prescription?.length ?? 0}세트</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}
        </li>
    )
}

export default function Routine() {
    const router = useRouter()
    const [routines, setRoutines] = useState<RoutineFinalResponse[]>([])
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [loadError, setLoadError] = useState(false)
    const [loadMoreError, setLoadMoreError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    const retryLoad = () => {
        setLoading(true)
        setLoadError(false)
        setReloadKey((k) => k + 1)
    }

    useEffect(() => {
        routineApiClient
            .getMyFinals(0, 20)
            .then((res) => {
                setRoutines(res.content)
                setHasMore(!res.last)
                setPage(0)
            })
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false))
    }, [reloadKey])

    const loadMore = () => {
        const next = page + 1
        setLoadingMore(true)
        setLoadMoreError(false)
        routineApiClient
            .getMyFinals(next, 20)
            .then((res) => {
                setRoutines((prev) => [...prev, ...res.content])
                setHasMore(!res.last)
                setPage(next)
            })
            .catch(() => setLoadMoreError(true))
            .finally(() => setLoadingMore(false))
    }

    const handlePlay = (routine: RoutineFinalResponse) => {
        router.push(prepareFinalRoutineForPlay(routine))
    }

    if (loading) {
        return (
            <Surface className="flex flex-col gap-5" aria-busy="true">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ))}
            </Surface>
        )
    }

    if (loadError) {
        return (
            <Notice tone="danger" title="저장한 루틴을 불러오지 못했어요">
                <Button variant="secondary" className="mt-2" onClick={retryLoad}>
                    다시 불러오기
                </Button>
            </Notice>
        )
    }

    if (routines.length === 0) {
        return (
            <Surface tone="sunken" padded={false}>
                <EmptyState title="저장한 루틴이 아직 없어요" body="만든 루틴을 저장하면 여기서 바로 다시 출발할 수 있어요." />
            </Surface>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <Surface>
                <ul className="flex flex-col divide-y divide-hairline">
                    {routines.map((r) => (
                        <RoutineCard key={r.routineFinalId} routine={r} onPlay={() => handlePlay(r)} />
                    ))}
                </ul>
            </Surface>
            {loadMoreError && (
                <p role="alert" className="text-caption text-danger-ink">
                    루틴을 더 불러오지 못했어요. 다시 눌러 보세요.
                </p>
            )}
            {hasMore && (
                <Button variant="ghost" block loading={loadingMore} onClick={loadMore}>
                    {loadMoreError ? "다시 불러오기" : "루틴 더 보기"}
                </Button>
            )}
        </div>
    )
}
