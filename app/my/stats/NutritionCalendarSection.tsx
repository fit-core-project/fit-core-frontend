"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { DietDailyAggregationResponse, NutritionTarget } from "@/types/project"
import NutritionTab from "@/app/my/nutrition/NutritionTab"
import { Surface } from "@/components/ui"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function monthRange(year: number, month: number): { from: string; to: string } {
    const from = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return { from, to }
}

function formatSelectedDateLabel(value: string): string {
    const [, month, day] = value.split("-").map(Number)
    return `${month}월 ${day}일 식단`
}

function dayColor(row: DietDailyAggregationResponse | undefined, kcalGoal: number | null | undefined): string {
    if (!row) return "text-ink hover:bg-surface"
    if (!kcalGoal) return "bg-ink text-white"
    return row.totalKcal > kcalGoal ? "bg-danger text-white" : "bg-ink text-white"
}

function dayStatus(row: DietDailyAggregationResponse | undefined, kcalGoal: number | null | undefined): string {
    if (!row) return "기록 없음"
    if (!kcalGoal) return "기록 있음"
    return row.totalKcal > kcalGoal ? "목표 초과" : "목표 이하"
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

export default function NutritionCalendarSection() {
    const today = getKstToday()
    const todayDate = new Date(today)

    const [year, setYear] = useState(todayDate.getFullYear())
    const [month, setMonth] = useState(todayDate.getMonth() + 1)
    const [rows, setRows] = useState<DietDailyAggregationResponse[]>([])
    const [target, setTarget] = useState<NutritionTarget | null>(null)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const detailRef = useRef<HTMLDivElement>(null)

    const { from, to } = useMemo(() => monthRange(year, month), [year, month])

    const fetchRows = useCallback(() => {
        dietApiClient
            .getDailySummary(from, to)
            .then((data) => startTransition(() => setRows(data)))
            .catch(() => {})
    }, [from, to])

    useEffect(() => {
        fetchRows()
    }, [fetchRows])

    useEffect(() => {
        nutritionTargetApiClient.getTarget().then((t) => startTransition(() => setTarget(t))).catch(() => {})
    }, [])

    useEffect(() => {
        if (selectedDate && detailRef.current) {
            detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [selectedDate])

    const rowMap = useMemo(() => {
        const m = new Map<string, DietDailyAggregationResponse>()
        for (const r of rows) m.set(r.date, r)
        return m
    }, [rows])

    const prevMonth = () => {
        if (month === 1) { setYear(y => y - 1); setMonth(12) }
        else setMonth(m => m - 1)
        setSelectedDate(null)
    }

    const nextMonth = () => {
        if (month === 12) { setYear(y => y + 1); setMonth(1) }
        else setMonth(m => m + 1)
        setSelectedDate(null)
    }

    const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()

    const cells: (number | null)[] = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    const handleDayClick = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        setSelectedDate(prev => prev === dateStr ? null : dateStr)
    }

    return (
        <>
            <Surface className="flex flex-col gap-3">
                <div className="flex items-center justify-center">
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={prevMonth}
                            aria-label="이전 달"
                            className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                        >
                            <ChevronLeft className="size-5" aria-hidden />
                        </button>
                        <span className="min-w-24 text-center text-body-sm font-bold tabular-nums text-ink" aria-live="polite">
                            {year}년 {month}월
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            aria-label="다음 달"
                            className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                        >
                            <ChevronRight className="size-5" aria-hidden />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 text-center" aria-hidden>
                    {DAY_LABELS.map((d) => (
                        <span key={d} className="text-caption font-medium text-ink-2">{d}</span>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                    {cells.map((day, i) => {
                        if (day === null) return <div key={`empty-${i}`} />
                        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        const row = rowMap.get(dateStr)
                        const color = dayColor(row, target?.kcalGoal)
                        const isSelected = selectedDate === dateStr
                        const isToday = dateStr === today
                        return (
                            <button
                                key={dateStr}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                aria-pressed={isSelected}
                                aria-current={isToday ? "date" : undefined}
                                aria-label={`${month}월 ${day}일, ${dayStatus(row, target?.kcalGoal)}${isToday ? ", 오늘" : ""}`}
                                className={`mx-auto flex size-11 items-center justify-center rounded-full text-body-sm tabular-nums transition-colors ${color} ${
                                    isSelected ? "outline-2 outline-offset-2 outline-ink" : ""
                                } ${isToday ? "font-bold" : "font-medium"} ${isToday && !row ? "border border-ink" : ""}`}
                            >
                                {day}
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-2">
                    {target?.kcalGoal ? (
                        <>
                            <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-ink" aria-hidden />목표 이하</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-danger" aria-hidden />목표 초과</span>
                        </>
                    ) : (
                        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-ink" aria-hidden />기록 있음</span>
                    )}
                    <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full border border-rail bg-ground" aria-hidden />기록 없음</span>
                </div>
                <p className="text-body-sm text-ink-2">날짜를 누르면 아래에 그날 식단이 열려요.</p>
            </Surface>

            {selectedDate && (
                <div ref={detailRef} className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 border-b border-hairline pb-2">
                        <h3 className="text-title-sm font-bold text-ink">{formatSelectedDateLabel(selectedDate)}</h3>
                        <button
                            type="button"
                            onClick={() => setSelectedDate(null)}
                            aria-label="선택한 날짜 식단 닫기"
                            className="-mr-2 inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                        >
                            <X className="size-5" aria-hidden />
                        </button>
                    </div>
                    <NutritionTab key={selectedDate} date={selectedDate} onRefresh={fetchRows} />
                </div>
            )}
        </>
    )
}
