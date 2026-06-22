"use client"

import { startTransition, useCallback, useEffect, useMemo, useState } from "react"
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { DietDailyAggregationResponse, NutritionTarget } from "@/types/project"

type Period = 7 | 30

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
}

function formatMD(dateStr: string): string {
    const [, m, d] = dateStr.split("-")
    return `${parseInt(m)}/${parseInt(d)}`
}

interface DayPoint {
    date: string       // "M/D" label
    rawDate: string    // "YYYY-MM-DD"
    kcal: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
}

function buildChartData(rows: DietDailyAggregationResponse[], from: string, to: string): DayPoint[] {
    const map = new Map(rows.map((r) => [r.date, r]))
    const points: DayPoint[] = []
    let cursor = from
    while (cursor <= to) {
        const row = map.get(cursor)
        points.push({
            date: formatMD(cursor),
            rawDate: cursor,
            kcal: row ? row.totalKcal : null,
            proteinG: row ? Number(row.totalProteinG) : null,
            carbsG: row ? Number(row.totalCarbsG) : null,
            fatG: row ? Number(row.totalFatG) : null,
        })
        cursor = addDays(cursor, 1)
    }
    return points
}

function avg(values: number[]): number | null {
    if (values.length === 0) return null
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

function avgMacro(values: number[]): number {
    if (values.length === 0) return 0
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

const CHART_STYLE = {
    borderRadius: "12px",
    border: "none",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
    fontSize: "11px",
    padding: "6px 10px",
}

export default function NutritionTrendSection() {
    const [period, setPeriod] = useState<Period>(7)
    const [rows, setRows] = useState<DietDailyAggregationResponse[]>([])
    const [target, setTarget] = useState<NutritionTarget | null>(null)
    const [loading, setLoading] = useState(true)

    const { from, to } = useMemo(() => {
        const today = getKstToday()
        return { from: addDays(today, -(period - 1)), to: today }
    }, [period])

    const fetchData = useCallback(() => {
        startTransition(() => setLoading(true))
        dietApiClient
            .getDailySummary(from, to)
            .then((data) => startTransition(() => setRows(data)))
            .catch(() => {})
            .finally(() => startTransition(() => setLoading(false)))
    }, [from, to])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        nutritionTargetApiClient.getTarget().then((t) => startTransition(() => setTarget(t))).catch(() => {})
    }, [])

    const chartData = useMemo(() => buildChartData(rows, from, to), [rows, from, to])

    const recordedRows = useMemo(() => rows.filter((r) => r.count > 0), [rows])

    const kcalGoal = target?.kcalGoal ?? null

    const avgKcal = avg(recordedRows.map((r) => r.totalKcal))
    const avgProtein = avgMacro(recordedRows.map((r) => Number(r.totalProteinG)))
    const avgCarbs = avgMacro(recordedRows.map((r) => Number(r.totalCarbsG)))
    const avgFat = avgMacro(recordedRows.map((r) => Number(r.totalFatG)))

    const achievementRate = useMemo(() => {
        if (!kcalGoal || recordedRows.length === 0) return null
        const achieved = recordedRows.filter((r) => r.totalKcal <= kcalGoal).length
        return Math.round((achieved / recordedRows.length) * 100)
    }, [kcalGoal, recordedRows])

    const kcalValues = recordedRows.map((r) => r.totalKcal)
    const kcalMin = kcalValues.length > 0 ? Math.min(...kcalValues) : 0
    const kcalMax = kcalValues.length > 0 ? Math.max(...kcalValues) : 0
    const kcalDomainPad = Math.max(200, (kcalMax - kcalMin) * 0.25)
    const kcalDomain: [number, number] = kcalValues.length > 0
        ? [Math.max(0, Math.floor(kcalMin - kcalDomainPad)), Math.ceil(kcalMax + kcalDomainPad)]
        : [0, 2000]

    return (
        <div className="mt-4 space-y-3">
            {/* 헤더 + 기간 토글 */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">식단 추세</h2>
                <div className="flex overflow-hidden rounded-full border border-slate-200 text-xs font-semibold">
                    {([7, 30] as Period[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 transition-colors ${
                                period === p
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                        >
                            {p}일
                        </button>
                    ))}
                </div>
            </div>

            {/* 평균 + 달성률 카드 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                        {period}일 평균
                        {recordedRows.length > 0 && (
                            <span className="ml-1 text-slate-400">({recordedRows.length}일 기준)</span>
                        )}
                    </p>
                    {achievementRate !== null && (
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-semibold text-slate-400">목표 달성률</span>
                            <span
                                className={`text-sm font-extrabold ${
                                    achievementRate >= 80 ? "text-emerald-500" : achievementRate >= 50 ? "text-amber-500" : "text-red-500"
                                }`}
                            >
                                {achievementRate}%
                            </span>
                        </div>
                    )}
                </div>

                {recordedRows.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-2">기간 내 기록이 없습니다</p>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-semibold text-slate-400">칼로리</span>
                            <span className="text-sm font-extrabold text-slate-700">{avgKcal?.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400">kcal</span>
                        </div>
                        <div className="flex flex-col items-center border-l border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400">탄수화물</span>
                            <span className="text-sm font-extrabold text-amber-500">{avgCarbs}</span>
                            <span className="text-[9px] text-slate-400">g</span>
                        </div>
                        <div className="flex flex-col items-center border-l border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400">단백질</span>
                            <span className="text-sm font-extrabold text-emerald-500">{avgProtein}</span>
                            <span className="text-[9px] text-slate-400">g</span>
                        </div>
                        <div className="flex flex-col items-center border-l border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400">지방</span>
                            <span className="text-sm font-extrabold text-blue-500">{avgFat}</span>
                            <span className="text-[9px] text-slate-400">g</span>
                        </div>
                    </div>
                )}
            </div>

            {/* kcal 추세 차트 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-500">
                    칼로리 추세
                    {kcalGoal && <span className="ml-1 text-slate-400">· 목표 {kcalGoal.toLocaleString()} kcal</span>}
                </p>
                {loading ? (
                    <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
                ) : (
                    <div className="h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={period === 7 ? 0 : "preserveStartEnd"}
                                    dy={3}
                                />
                                <YAxis
                                    fontSize={9}
                                    domain={kcalDomain}
                                    tickLine={false}
                                    axisLine={false}
                                    width={36}
                                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                                />
                                {kcalGoal && (
                                    <ReferenceLine
                                        y={kcalGoal}
                                        stroke="#f87171"
                                        strokeDasharray="5 3"
                                        strokeWidth={1.5}
                                        label={{ value: `목표 ${kcalGoal}`, position: "insideTopRight", fontSize: 9, fill: "#f87171" }}
                                    />
                                )}
                                <Tooltip
                                    formatter={(value) => [`${Number(value).toLocaleString()} kcal`, "칼로리"]}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.rawDate ?? ""}
                                    contentStyle={CHART_STYLE}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="kcal"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={{ r: 3, strokeWidth: 1.5, fill: "#fff", stroke: "#6366f1" }}
                                    activeDot={{ r: 5 }}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* 탄단지 추세 차트 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                    <p className="text-xs font-semibold text-slate-500">매크로 추세</p>
                    <div className="flex gap-2 text-[10px]">
                        <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-3 rounded-sm bg-amber-400" />탄</span>
                        <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-400" />단</span>
                        <span className="flex items-center gap-0.5"><span className="inline-block h-2 w-3 rounded-sm bg-blue-400" />지</span>
                    </div>
                </div>
                {loading ? (
                    <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
                ) : (
                    <div className="h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={period === 7 ? 0 : "preserveStartEnd"}
                                    dy={3}
                                />
                                <YAxis
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    width={30}
                                    tickFormatter={(v) => `${v}g`}
                                />
                                <Tooltip
                                    formatter={(value, name) => {
                                        const label = name === "carbsG" ? "탄수화물" : name === "proteinG" ? "단백질" : "지방"
                                        return [`${Number(value).toFixed(1)}g`, label]
                                    }}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.rawDate ?? ""}
                                    contentStyle={CHART_STYLE}
                                />
                                <Line type="monotone" dataKey="carbsG" stroke="#fbbf24" strokeWidth={1.5}
                                    dot={{ r: 2, fill: "#fff", stroke: "#fbbf24", strokeWidth: 1.5 }}
                                    connectNulls={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="proteinG" stroke="#34d399" strokeWidth={1.5}
                                    dot={{ r: 2, fill: "#fff", stroke: "#34d399", strokeWidth: 1.5 }}
                                    connectNulls={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="fatG" stroke="#60a5fa" strokeWidth={1.5}
                                    dot={{ r: 2, fill: "#fff", stroke: "#60a5fa", strokeWidth: 1.5 }}
                                    connectNulls={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    )
}
