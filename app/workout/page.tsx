"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import TodayWorkoutCard from "@/app/components/TodayWorkoutCard"
import type { AttendanceWeekResponse, WorkoutSessionResponse } from "@/types/project"
import WorkoutList from "@/app/my/workout/WorkoutList"
import Routine from "@/app/my/routine/Routine"
import WorkoutDetailModal from "@/app/my/workout/WorkoutDetailModal"
import { splitTitle } from "@/utils/displayLabels"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import { LineBadge, Section, cx } from "@/components/ui"

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function parseYmd(value: string): Date {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
}

function formatYmd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getWorkoutDate(workout: WorkoutSessionResponse): string {
    return typeof workout.workoutDate === "string" ? workout.workoutDate.slice(0, 10) : formatYmd(workout.workoutDate)
}

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

function lineForWorkout(workout: WorkoutSessionResponse): RouteLine {
    return lineForRoutine(workout.targetSplitLabel ?? workout.splitLabel)
}

function getWeekRange(today: string): { start: string; end: string } {
    const date = parseYmd(today)
    const day = date.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = new Date(date)
    start.setDate(date.getDate() + mondayOffset)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start: formatYmd(start), end: formatYmd(end) }
}

function inRange(date: string, start: string, end: string): boolean {
    return date >= start && date <= end
}

function formatMD(dateStr: string): string {
    const date = parseYmd(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatLongDate(dateStr: string): string {
    const date = parseYmd(dateStr)
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${DAY_LABELS[date.getDay()]}요일`
}

function buildMonthCells(year: number, month: number): Array<number | null> {
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells: Array<number | null> = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
    const value = Math.round(Math.min(percent, 100))
    return (
        <div className="flex items-center gap-3">
            <div
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={value}
                className="h-2 flex-1 overflow-hidden bg-hairline"
            >
                <div className="h-full bg-ink" style={{ width: `${value}%` }} />
            </div>
            <span className="w-10 text-right text-body-sm font-bold text-ink tabular-nums">{value}%</span>
        </div>
    )
}

export default function WorkoutPage() {
    const today = getKstToday()
    const todayDate = parseYmd(today)
    const weekRange = getWeekRange(today)

    const recentWorkoutRef = useRef<HTMLElement | null>(null)

    const [workouts, setWorkouts] = useState<WorkoutSessionResponse[]>([])
    const [attendance, setAttendance] = useState<AttendanceWeekResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [monthCursor, setMonthCursor] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() + 1 })
    const [selectedDate, setSelectedDate] = useState<string | null>(today)
    const [selectedWorkoutDetail, setSelectedWorkoutDetail] = useState<WorkoutSessionResponse | null>(null)

    useEffect(() => {
        Promise.all([workoutApiClient.getRecent(0, 100), workoutApiClient.getAttendance()])
            .then(([recent, attendanceRows]) => {
                setWorkouts(recent.content ?? [])
                setAttendance(attendanceRows ?? [])
            })
            .catch(() => {
                setWorkouts([])
                setAttendance([])
            })
            .finally(() => setLoading(false))
    }, [])

    const workoutsByDate = useMemo(() => {
        const map = new Map<string, WorkoutSessionResponse[]>()
        workouts.forEach((workout) => {
            const date = getWorkoutDate(workout)
            const list = map.get(date) ?? []
            list.push(workout)
            map.set(date, list)
        })
        return map
    }, [workouts])


    const currentAttendance = attendance.find((row) => inRange(today, row.weekStart, row.weekEnd))
    const weeklyActual =
        currentAttendance?.actualDays ??
        new Set(workouts.map(getWorkoutDate).filter((date) => inRange(date, weekRange.start, weekRange.end))).size
    const weeklyTarget = currentAttendance?.targetDays ?? null
    const weeklyPercent = weeklyTarget ? Math.min((weeklyActual / weeklyTarget) * 100, 100) : null

    const cells = buildMonthCells(monthCursor.year, monthCursor.month)
    const selectedWorkouts = selectedDate ? workoutsByDate.get(selectedDate) ?? [] : []


    const moveMonth = (delta: number) => {
        setMonthCursor((current) => {
            const next = new Date(current.year, current.month - 1 + delta, 1)
            return { year: next.getFullYear(), month: next.getMonth() + 1 }
        })
        setSelectedDate(null)
    }

    return (
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-7 bg-ground px-4 pb-24 pt-5">
            <h1 className="text-title font-bold text-ink">운동</h1>

            <TodayWorkoutCard />

            {!loading && (
                <div className="-mt-3 flex flex-col gap-2" aria-label={`주간 목표 ${formatMD(weekRange.start)} - ${formatMD(weekRange.end)}`}>
                    {weeklyTarget ? (
                        <>
                            <p className="text-body-sm text-ink tabular-nums">
                                주간 목표 <span className="font-bold">{weeklyTarget}회</span> 중 <span className="font-bold">{weeklyActual}회</span> 운행했어요
                            </p>
                            <ProgressBar percent={weeklyPercent ?? 0} label="이번 주 운동 목표 달성률" />
                        </>
                    ) : (
                        <p className="text-body-sm text-ink-2">
                            주당 횟수를 정하면 이번 주 진행률을 볼 수 있어요.{" "}
                            <Link href="/my?tab=workout" className="font-bold text-ink underline underline-offset-2">
                                주간 목표 정하기
                            </Link>
                        </p>
                    )}
                </div>
            )}

            <Link
                href="/workout/programs"
                className="flex min-h-16 items-center gap-3 rounded-panel border border-hairline bg-ground px-4 py-3 hover:bg-surface"
            >
                <span aria-hidden className="flex shrink-0 items-center">
                    {(["push", "pull", "legs"] as const).map((line, i) => (
                        <span key={line} className="flex items-center">
                            {i > 0 && <span className="h-1 w-2.5" style={{ background: ROUTE_LINE_COLOR_VAR[line] }} />}
                            <span className="size-3 rounded-full border-[3px] bg-ground" style={{ borderColor: ROUTE_LINE_COLOR_VAR[line] }} />
                        </span>
                    ))}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-body font-bold text-ink">운동 프로그램</span>
                    <span className="block text-body-sm text-ink-2">저장한 루틴을 이어 타는 환승 노선을 만들어요.</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
            </Link>

            <Section title="저장 루틴">
                <Routine />
            </Section>

            <Section
                title="운동 캘린더"
                action={
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => moveMonth(-1)}
                            aria-label="이전 달"
                            className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                        >
                            <ChevronLeft className="size-5" aria-hidden />
                        </button>
                        <span className="min-w-[5.5rem] text-center text-body-sm font-medium text-ink tabular-nums" aria-live="polite">
                            {monthCursor.year}년 {monthCursor.month}월
                        </span>
                        <button
                            type="button"
                            onClick={() => moveMonth(1)}
                            aria-label="다음 달"
                            className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                        >
                            <ChevronRight className="size-5" aria-hidden />
                        </button>
                    </div>
                }
            >
                <div>
                    <div className="mb-1 grid grid-cols-7 text-center" aria-hidden>
                        {DAY_LABELS.map((day) => (
                            <span key={day} className="text-caption text-ink-2">
                                {day}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1">
                        {cells.map((day, index) => {
                            if (day === null) return <div key={`empty-${index}`} />
                            const dateStr = `${monthCursor.year}-${String(monthCursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                            const dayWorkouts = workoutsByDate.get(dateStr) ?? []
                            const line = dayWorkouts.length > 0 ? lineForWorkout(dayWorkouts[0]) : null
                            const isSelected = selectedDate === dateStr
                            const isToday = dateStr === today

                            return (
                                <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => setSelectedDate((prev) => (prev === dateStr ? null : dateStr))}
                                    aria-pressed={isSelected}
                                    aria-label={`${monthCursor.month}월 ${day}일${isToday ? " 오늘" : ""}, ${
                                        dayWorkouts.length > 0 ? `운동 ${dayWorkouts.length}회` : "운동 없음"
                                    }`}
                                    className={cx(
                                        "relative mx-auto flex size-11 flex-col items-center justify-center rounded-full text-body-sm tabular-nums transition-[background-color] duration-150",
                                        isSelected
                                            ? "bg-ink font-bold text-white"
                                            : isToday
                                              ? "font-bold text-ink ring-2 ring-inset ring-ink hover:bg-surface"
                                              : line
                                                ? "font-medium text-ink hover:bg-surface"
                                                : "text-ink-2 hover:bg-surface",
                                    )}
                                >
                                    {day}
                                    {line && (
                                        <span
                                            aria-hidden
                                            className="absolute bottom-1.5 size-1.5 rounded-full"
                                            style={{ background: isSelected ? "var(--color-ground)" : ROUTE_LINE_COLOR_VAR[line] }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-2" aria-hidden>
                        <span className="flex items-center gap-1.5">
                            <span className="flex gap-0.5">
                                {(["push", "pull", "legs", "core"] as const).map((l) => (
                                    <span key={l} className="inline-block size-1.5 rounded-full" style={{ background: ROUTE_LINE_COLOR_VAR[l] }} />
                                ))}
                            </span>
                            운동한 날(분할별 노선 색)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block size-3 rounded-full border-2 border-ink" />
                            오늘
                        </span>
                    </div>
                </div>

                {selectedDate && (
                    <div className="flex flex-col gap-1 border-t border-hairline pt-3">
                        <h3 className="text-body-sm font-bold text-ink">{formatLongDate(selectedDate)}</h3>
                        {selectedWorkouts.length > 0 ? (
                            <ul className="flex flex-col divide-y divide-hairline">
                                {selectedWorkouts.map((workout) => (
                                    <li key={workout.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedWorkoutDetail(workout)}
                                            className="flex min-h-14 w-full items-center gap-3 py-2 text-left hover:bg-surface"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <LineBadge line={lineForWorkout(workout)} className="shrink-0" />
                                                    <span className="truncate text-body font-bold text-ink">{getWorkoutTitle(workout)}</span>
                                                </span>
                                                <span className="mt-0.5 block text-body-sm text-ink-2 tabular-nums">
                                                    {workout.durationMin ? `${workout.durationMin}분 · ` : ""}
                                                    {(workout.sets ?? []).length}세트
                                                </span>
                                            </span>
                                            <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-2 text-body-sm text-ink-2">이 날은 운동 기록이 없어요.</p>
                        )}
                    </div>
                )}

                {selectedWorkoutDetail && (
                    <WorkoutDetailModal workout={selectedWorkoutDetail} onClose={() => setSelectedWorkoutDetail(null)} />
                )}
            </Section>

            <Section title="최근 운동 기록" ref={recentWorkoutRef} className="scroll-mt-4">
                <WorkoutList />
            </Section>
        </div>
    )
}
