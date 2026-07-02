"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Plus, Target } from "lucide-react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import type { AttendanceWeekResponse, WorkoutSessionResponse } from "@/types/project"
import WorkoutList from "@/app/my/workout/WorkoutList"

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
        workout.splitLabel?.trim() ||
        workout.targetSplitLabel?.trim() ||
        "운동 세션"
    )
}

function getWorkoutVolume(workout: WorkoutSessionResponse): number {
    return (workout.sets ?? []).reduce((total, set) => total + Math.max(0, set.weightKg ?? 0) * Math.max(0, set.reps ?? 0), 0)
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

function ProgressBar({ percent, color = "bg-blue-500" }: { percent: number; color?: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-black text-slate-600">{Math.round(percent)}%</span>
        </div>
    )
}

export default function WorkoutPage() {
    const today = getKstToday()
    const todayDate = parseYmd(today)
    const weekRange = getWeekRange(today)

    const [workouts, setWorkouts] = useState<WorkoutSessionResponse[]>([])
    const [attendance, setAttendance] = useState<AttendanceWeekResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [monthCursor, setMonthCursor] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() + 1 })
    const [selectedDate, setSelectedDate] = useState<string | null>(today)

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

    const todayWorkouts = workoutsByDate.get(today) ?? []
    const todayDuration = todayWorkouts.reduce((total, workout) => total + (workout.durationMin ?? 0), 0)
    const todayVolume = todayWorkouts.reduce((total, workout) => total + getWorkoutVolume(workout), 0)
    const representativeWorkout = todayWorkouts[0]

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
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 p-4 pb-10">
            <header className="flex items-end justify-between gap-3 px-1">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-500">Workout</p>
                    <h1 className="text-2xl font-extrabold text-slate-900">운동</h1>
                </div>
                <Link
                    href="/ai_routine"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    루틴 만들기
                </Link>
            </header>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-blue-500" />
                    <h2 className="text-base font-extrabold text-slate-800">오늘 운동</h2>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                        <div className="h-11 w-32 animate-pulse rounded-2xl bg-slate-100" />
                    </div>
                ) : todayWorkouts.length > 0 ? (
                    <div>
                        <p className="text-sm font-bold text-blue-600">오늘 운동 완료</p>
                        <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                            {getWorkoutTitle(representativeWorkout)}
                        </h3>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <p className="text-[11px] font-bold text-slate-400">운동 시간</p>
                                <p className="mt-1 text-lg font-black text-slate-800">{todayDuration || "-"}분</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <p className="text-[11px] font-bold text-slate-400">총 볼륨</p>
                                <p className="mt-1 text-lg font-black text-slate-800">
                                    {Math.round(todayVolume).toLocaleString()}kg
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedDate(today)}
                            className="mt-4 min-h-11 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                            기록 보기
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold text-slate-800">아직 오늘 완료한 운동이 없습니다.</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            최근 루틴을 시작하거나 AI 루틴을 생성해 보세요.
                        </p>
                        <Link
                            href="/ai_routine"
                            className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                        >
                            루틴 만들기
                        </Link>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-base font-extrabold text-slate-800">주간 운동 목표</h2>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                        <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
                    </div>
                ) : weeklyTarget ? (
                    <div>
                        <div className="mb-3 flex items-baseline justify-between">
                            <p className="text-sm font-semibold text-slate-600">
                                이번 주 {weeklyTarget}회 목표 중 {weeklyActual}회 완료
                            </p>
                            <p className="text-xs font-semibold text-slate-400">
                                {formatMD(weekRange.start)} - {formatMD(weekRange.end)}
                            </p>
                        </div>
                        <ProgressBar percent={weeklyPercent ?? 0} color={weeklyPercent && weeklyPercent >= 100 ? "bg-blue-500" : "bg-emerald-400"} />
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-bold text-slate-800">주간 운동 목표가 아직 설정되지 않았습니다.</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            목표를 설정하면 이번 주 진행률을 확인할 수 있습니다.
                        </p>
                        {weeklyActual > 0 && (
                            <p className="mt-3 text-xs font-semibold text-slate-400">
                                이번 주 완료 운동: {weeklyActual}회
                            </p>
                        )}
                        <Link
                            href="/my?tab=workout"
                            className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            운동 설정하기
                        </Link>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-blue-500" />
                        <h2 className="text-base font-extrabold text-slate-800">운동 캘린더</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => moveMonth(-1)} className="rounded-full p-1 hover:bg-slate-100">
                            <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </button>
                        <span className="text-sm font-semibold text-slate-700">
                            {monthCursor.year}년 {monthCursor.month}월
                        </span>
                        <button type="button" onClick={() => moveMonth(1)} className="rounded-full p-1 hover:bg-slate-100">
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="mb-1 grid grid-cols-7 text-center">
                    {DAY_LABELS.map((day) => (
                        <span key={day} className="text-[10px] font-semibold text-slate-400">
                            {day}
                        </span>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                    {cells.map((day, index) => {
                        if (day === null) return <div key={`empty-${index}`} />
                        const dateStr = `${monthCursor.year}-${String(monthCursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        const hasWorkout = (workoutsByDate.get(dateStr)?.length ?? 0) > 0
                        const isSelected = selectedDate === dateStr
                        const isToday = dateStr === today

                        return (
                            <button
                                key={dateStr}
                                type="button"
                                onClick={() => setSelectedDate((prev) => (prev === dateStr ? null : dateStr))}
                                className={`mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                    hasWorkout ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-100"
                                } ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""} ${
                                    isToday && !hasWorkout ? "border border-blue-400 text-blue-500" : ""
                                }`}
                            >
                                {day}
                                {hasWorkout && <span className="mt-0.5 h-1 w-1 rounded-full bg-white/70" />}
                            </button>
                        )
                    })}
                </div>

                <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                        운동 완료
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-400" />
                        오늘
                    </span>
                </div>

                {selectedDate && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-bold text-slate-700">{selectedDate} 운동 기록</p>
                        {selectedWorkouts.length > 0 ? (
                            <div className="space-y-2">
                                {selectedWorkouts.map((workout) => (
                                    <div key={workout.id} className="rounded-xl bg-white px-3 py-3">
                                        <p className="text-sm font-bold text-slate-800">{getWorkoutTitle(workout)}</p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {workout.durationMin ? `${workout.durationMin}분 · ` : ""}
                                            {(workout.sets ?? []).length}세트
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">이 날짜에는 운동 기록이 없습니다.</p>
                        )}
                    </div>
                )}
            </section>

            <section>
                <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-base font-extrabold text-slate-800">최근 운동 기록</h2>
                    <Link href="/my?tab=workout" className="text-xs font-bold text-blue-600">
                        루틴 보기
                    </Link>
                </div>
                <div className="-mx-4">
                    <WorkoutList />
                </div>
            </section>
        </div>
    )
}
