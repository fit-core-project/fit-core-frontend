"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { DietDailyAggregationResponse, NutritionTarget } from "@/types/project"
import NutritionTab from "@/app/my/nutrition/NutritionTab"

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
    if (!row) return "bg-slate-100 text-slate-400"
    if (!kcalGoal) return "bg-emerald-400 text-white"
    return row.totalKcal > kcalGoal ? "bg-red-400 text-white" : "bg-emerald-400 text-white"
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
            <div className="rounded-2xl bg-white p-5 shadow-sm mt-4">
                {/* 헤더 */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800">식단 캘린더</h2>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={prevMonth} className="rounded-full p-1 hover:bg-slate-100">
                            <ChevronLeft size={16} className="text-slate-500" />
                        </button>
                        <span className="text-sm font-semibold text-slate-700">{year}년 {month}월</span>
                        <button type="button" onClick={nextMonth} className="rounded-full p-1 hover:bg-slate-100">
                            <ChevronRight size={16} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* 요일 헤더 */}
                <div className="mb-1 grid grid-cols-7 text-center">
                    {DAY_LABELS.map((d) => (
                        <span key={d} className="text-[10px] font-semibold text-slate-400">{d}</span>
                    ))}
                </div>

                {/* 날짜 셀 */}
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
                                className={`mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs font-semibold transition-all
                                    ${row ? color : "text-slate-400 hover:bg-slate-100"}
                                    ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                                    ${isToday && !row ? "border border-blue-400 text-blue-500" : ""}
                                `}
                            >
                                {day}
                                {row && <span className="mt-0.5 h-1 w-1 rounded-full bg-white/70" />}
                            </button>
                        )
                    })}
                </div>

                {/* 범례 */}
                <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />목표 이하</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />목표 초과</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-100 border border-slate-200" />기록 없음</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    캘린더에서 날짜를 선택하면 아래에서 해당 날짜의 식단 기록을 확인할 수 있습니다.
                </p>
            </div>

            {/* 선택 날짜 상세 */}
            {selectedDate && (
                <div ref={detailRef} className="mt-4">
                    <div className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-emerald-600">선택 날짜 식단</p>
                                <h3 className="mt-1 text-base font-extrabold text-slate-800">
                                    {formatSelectedDateLabel(selectedDate)}
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    이 날짜의 식단 기록을 확인하고 필요한 경우 식단을 추가하거나 수정할 수 있습니다.
                                </p>
                            </div>
                        <button type="button" onClick={() => setSelectedDate(null)} className="rounded-full p-1 hover:bg-slate-100">
                            <X size={16} className="text-slate-400" />
                        </button>
                        </div>
                    </div>
                    <NutritionTab key={selectedDate} date={selectedDate} onRefresh={fetchRows} />
                </div>
            )}
        </>
    )
}
