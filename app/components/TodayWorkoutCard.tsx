"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, PenLine, Play } from "lucide-react"
import { toast } from "sonner"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { clearProgramContext } from "@/utils/programContext"
import type { WorkoutSessionResponse } from "@/types/project"
import type { RoutineFinalResponse } from "@/types/routine"
import { getKstToday } from "@/utils/date"
import { splitTitle } from "@/utils/displayLabels"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR } from "@/utils/routeLine"
import { prepareFinalRoutineForPlay } from "@/utils/routinePlay"
import { Button, ButtonLink, LineBadge, Notice, RouteStrip, Section, Sheet, Skeleton, Surface, Tag } from "@/components/ui"

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
const MAX_STOPS = 5

function getWorkoutTitle(session: WorkoutSessionResponse): string {
    return (
        session.routineName?.trim() ||
        session.title?.trim() ||
        session.summaryTitle?.trim() ||
        splitTitle(session.splitLabel) ||
        splitTitle(session.targetSplitLabel) ||
        "운동 세션"
    )
}

/** Station names for a route strip: at most MAX_STOPS, the overflow folded into the last stop. */
function toStops(names: string[]): string[] {
    return names.length > MAX_STOPS ? [...names.slice(0, MAX_STOPS - 1), `외 ${names.length - MAX_STOPS + 1}개`] : names
}

function sessionStops(session: WorkoutSessionResponse): string[] {
    const ordered = [...(session.sets ?? [])].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    return toStops([...new Set(ordered.map((set) => set.exerciseNameSnapshot).filter(Boolean))])
}

const GUIDE_STOPS = ["컨디션 체크", "루틴 만들기", "출발"]

/** Monday-first dates (YYYY-MM-DD) of the week containing `today`. */
function weekDates(today: string): string[] {
    const base = new Date(`${today}T00:00:00Z`)
    const offset = (base.getUTCDay() + 6) % 7
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base)
        d.setUTCDate(base.getUTCDate() - offset + i)
        return d.toISOString().slice(0, 10)
    })
}

export default function TodayWorkoutCard() {
    const router = useRouter()
    const today = getKstToday()

    const [isLoading, setIsLoading] = useState(true)
    const [sessions, setSessions] = useState<WorkoutSessionResponse[]>([])
    const [latestRoutine, setLatestRoutine] = useState<RoutineFinalResponse | null>(null)
    const [hasError, setHasError] = useState(false)
    const [isCreatingManualRoutine, setIsCreatingManualRoutine] = useState(false)
    const [optionsOpen, setOptionsOpen] = useState(false)

    useEffect(() => {
        Promise.all([
            workoutApiClient.getRecent(0, 14).then((page) => setSessions(page.content ?? [])),
            routineApiClient
                .getMyFinals(0, 1)
                .then((page) => setLatestRoutine(page.content?.[0] ?? null))
                .catch(() => setLatestRoutine(null)),
        ])
            .catch(() => setHasError(true))
            .finally(() => setIsLoading(false))
    }, [])

    const todaySessions = useMemo(() => sessions.filter((s) => String(s.workoutDate).slice(0, 10) === today), [sessions, today])
    const totalDurationMin = todaySessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
    const week = useMemo(() => weekDates(today), [today])

    const handleCreateManualRoutine = async () => {
        if (isCreatingManualRoutine) return
        setIsCreatingManualRoutine(true)
        clearProgramContext()
        try {
            const draft = await routineApiClient.createManualDraft("새 루틴")
            localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))
            router.push("/routine/draft?mode=manual")
        } catch {
            toast.error("루틴을 만들지 못했어요.")
        } finally {
            setIsCreatingManualRoutine(false)
        }
    }

    const createButtons = (
        <div className="grid grid-cols-2 gap-2">
            <Button
                variant="secondary"
                loading={isCreatingManualRoutine}
                icon={<PenLine className="size-4" aria-hidden />}
                onClick={() => {
                    setOptionsOpen(false)
                    handleCreateManualRoutine()
                }}
            >
                직접 만들기
            </Button>
            <Button
                variant="primary"
                icon={<Dumbbell className="size-4" aria-hidden />}
                onClick={() => {
                    setOptionsOpen(false)
                    router.push("/ai_routine")
                }}
            >
                AI 루틴 만들기
            </Button>
        </div>
    )

    const renderToday = () => {
        if (isLoading) {
            return (
                <Surface tone="sunken" className="flex flex-col gap-3" aria-busy="true">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-12 w-full" />
                </Surface>
            )
        }
        if (hasError) {
            return (
                <Notice tone="danger" title="오늘 운동 정보를 불러오지 못했어요">
                    잠시 뒤 다시 열거나 운동 탭에서 확인하세요.
                </Notice>
            )
        }
        if (todaySessions.length > 0) {
            const last = todaySessions[0]
            const line = lineForRoutine(last.targetSplitLabel ?? last.splitLabel)
            const title = todaySessions.length === 1 ? getWorkoutTitle(last) : `오늘 ${todaySessions.length}회 운동`
            const stops = sessionStops(last)
            return (
                <Surface tone="sunken" className="flex flex-col gap-4">
                    <div>
                        <p className="text-title-sm font-bold text-ink">{title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <LineBadge line={line} />
                            <Tag className="bg-ground">종점 도착</Tag>
                            {totalDurationMin > 0 && <span className="text-body-sm text-ink-2 tabular-nums">총 {totalDurationMin}분</span>}
                        </div>
                    </div>
                    {stops.length > 0 && <RouteStrip line={line} label={`${title} 지나온 노선`} stops={stops} />}
                    <div className="grid grid-cols-2 gap-2">
                        <ButtonLink href="/workout" variant="secondary">
                            기록 보기
                        </ButtonLink>
                        <Button variant="ghost" onClick={() => setOptionsOpen(true)}>
                            한 번 더 하기
                        </Button>
                    </div>
                </Surface>
            )
        }
        if (latestRoutine) {
            const payload = latestRoutine.finalRoutinePayload
            const blocks = payload.routineBlocks ?? []
            const line = lineForRoutine(latestRoutine.targetSplitLabel, blocks.flatMap((b) => b.primaryMuscles ?? []))
            const stops = toStops(blocks.map((b) => b.exerciseName || "운동"))
            const title = payload.summaryTitle?.trim() || splitTitle(latestRoutine.targetSplitLabel) || "저장한 루틴"
            return (
                <Surface tone="sunken" className="flex flex-col gap-4">
                    <div>
                        <LineBadge line={line} />
                        <p className="mt-1.5 text-title-sm font-bold text-ink">{title}</p>
                        <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                            {blocks.length}개 운동 · 약 {payload.totalEstimatedTime}분
                        </p>
                    </div>
                    {stops.length > 0 && <RouteStrip line={line} label={`${title} 노선`} stops={stops} />}
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="primary"
                            size="lg"
                            block
                            line={line}
                            icon={<Play className="size-4" aria-hidden />}
                            onClick={() => router.push(prepareFinalRoutineForPlay(latestRoutine))}
                        >
                            출발하기
                        </Button>
                        <Button variant="ghost" block onClick={() => setOptionsOpen(true)}>
                            다른 루틴 만들기
                        </Button>
                    </div>
                </Surface>
            )
        }
        return (
            <Surface tone="sunken" className="flex flex-col gap-4">
                <div>
                    <p className="text-title-sm font-bold text-ink">오늘 탈 노선이 없어요</p>
                    <p className="mt-0.5 text-body-sm text-ink-2">AI가 몸 상태에 맞춰 짜 주거나, 직접 운동을 골라 만들 수 있어요.</p>
                </div>
                <RouteStrip muted line="mixed" label="루틴을 만드는 순서" stops={GUIDE_STOPS} />
                {createButtons}
            </Surface>
        )
    }

    return (
        <>
            <Section title="오늘의 노선">{renderToday()}</Section>

            {!isLoading && !hasError && (
                <Section title="이번 주 운행">
                    <ol className="relative grid grid-cols-7 text-center" aria-label="이번 주 운동 기록">
                        <span aria-hidden className="absolute inset-x-[7.14%] top-[1.95rem] h-1 rounded-full bg-rail" />
                        {week.map((date, i) => {
                            const session = sessions.find((s) => String(s.workoutDate).slice(0, 10) === date)
                            const line = session ? lineForRoutine(session.targetSplitLabel ?? session.splitLabel) : null
                            const isToday = date === today
                            return (
                                <li key={date} className="flex flex-col items-center gap-1.5">
                                    <span className={isToday ? "text-caption font-bold text-ink" : "text-caption text-ink-2"}>{WEEKDAYS[i]}</span>
                                    <span
                                        aria-hidden
                                        className="relative z-10 size-3.5 rounded-full border-[3px] bg-ground"
                                        style={
                                            line
                                                ? { borderColor: ROUTE_LINE_COLOR_VAR[line], background: ROUTE_LINE_COLOR_VAR[line] }
                                                : { borderColor: isToday ? "var(--color-ink)" : "var(--color-rail)" }
                                        }
                                    />
                                    <span className="sr-only">
                                        {date} {session ? getWorkoutTitle(session) : "운동 없음"}
                                    </span>
                                </li>
                            )
                        })}
                    </ol>
                </Section>
            )}

            <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="새 루틴 만들기" description="AI에게 맡기거나 직접 운동을 고를 수 있어요.">
                {createButtons}
            </Sheet>
        </>
    )
}
