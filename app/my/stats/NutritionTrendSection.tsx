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
import { Section, Skeleton, Surface, ToggleChip } from "@/components/ui"

type Period = 7 | 30

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
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

// Same hex values as the @theme tokens in app/globals.css (recharts needs literal colors).
const INK = "#14213d"
const INK_2 = "#5b6478"
const INK_3 = "#8a93a6"
const HAIRLINE = "#e3e7ee"
const LINE_PUSH = "#0052a4"
const DANGER = "#d92d20"

const TICK = { fontSize: 12, fill: INK_2 }

const CHART_STYLE = {
    borderRadius: "6px",
    border: `1px solid ${HAIRLINE}`,
    boxShadow: "none",
    fontSize: "12px",
    color: INK,
    padding: "6px 10px",
}

// Macro series: ink / push blue / muted ink, separated by dash pattern as well as colour.
const MACRO_SERIES = [
    { key: "carbsG", label: "탄수화물", color: INK, dash: undefined },
    { key: "proteinG", label: "단백질", color: LINE_PUSH, dash: "6 3" },
    { key: "fatG", label: "지방", color: INK_3, dash: "2 3" },
] as const

function LegendSwatch({ color, dash }: { color: string; dash?: string }) {
    return (
        <svg width="20" height="8" aria-hidden className="shrink-0">
            <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} />
        </svg>
    )
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

    const stats = [
        { label: "칼로리", value: avgKcal?.toLocaleString(), unit: "kcal" },
        { label: "탄수화물", value: avgCarbs, unit: "g" },
        { label: "단백질", value: avgProtein, unit: "g" },
        { label: "지방", value: avgFat, unit: "g" },
    ]

    return (
        <Section
            title="식단 추세"
            action={
                <div className="flex gap-1.5" role="group" aria-label="기간">
                    {([7, 30] as Period[]).map((p) => (
                        <ToggleChip key={p} pressed={period === p} onClick={() => setPeriod(p)}>
                            {p}일
                        </ToggleChip>
                    ))}
                </div>
            }
        >
            <Surface className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-body-sm font-medium text-ink">
                        {period}일 평균
                        {recordedRows.length > 0 && <span className="ml-1 font-normal text-ink-2">({recordedRows.length}일 기준)</span>}
                    </p>
                    {achievementRate !== null && (
                        <p className="text-body-sm text-ink-2">
                            목표 달성률 <span className="font-bold tabular-nums text-ink">{achievementRate}%</span>
                        </p>
                    )}
                </div>

                {recordedRows.length === 0 ? (
                    <p className="py-2 text-center text-body-sm text-ink-2">이 기간에 식단 기록이 없어요. 식단을 기록하면 평균이 보여요.</p>
                ) : (
                    <dl className="grid grid-cols-4 divide-x divide-hairline">
                        {stats.map((stat) => (
                            <div key={stat.label} className="flex flex-col items-center gap-0.5 px-1">
                                <dt className="text-caption text-ink-2">{stat.label}</dt>
                                <dd className="text-body font-bold tabular-nums text-ink">
                                    {stat.value}
                                    <span className="ml-0.5 text-caption font-normal text-ink-2">{stat.unit}</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </Surface>

            <Surface className="flex flex-col gap-2">
                <p className="text-body-sm font-medium text-ink">
                    칼로리
                    {kcalGoal && <span className="ml-1 font-normal text-ink-2">· 목표 {kcalGoal.toLocaleString()} kcal</span>}
                </p>
                {loading ? (
                    <Skeleton className="h-40 w-full" />
                ) : (
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                <CartesianGrid vertical={false} stroke={HAIRLINE} />
                                <XAxis
                                    dataKey="date"
                                    tick={TICK}
                                    tickLine={false}
                                    axisLine={{ stroke: HAIRLINE }}
                                    interval={period === 7 ? 0 : "preserveStartEnd"}
                                    dy={4}
                                />
                                <YAxis
                                    tick={TICK}
                                    domain={kcalDomain}
                                    tickLine={false}
                                    axisLine={false}
                                    width={44}
                                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                                />
                                {kcalGoal && (
                                    <ReferenceLine
                                        y={kcalGoal}
                                        stroke={DANGER}
                                        strokeDasharray="5 3"
                                        strokeWidth={1.5}
                                        label={{ value: `목표 ${kcalGoal}`, position: "insideTopRight", fontSize: 12, fill: INK_2 }}
                                    />
                                )}
                                <Tooltip
                                    formatter={(value) => [`${Number(value).toLocaleString()} kcal`, "칼로리"]}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.rawDate ?? ""}
                                    contentStyle={CHART_STYLE}
                                    itemStyle={{ color: INK }}
                                    cursor={{ stroke: HAIRLINE }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="kcal"
                                    stroke={INK}
                                    strokeWidth={2}
                                    dot={{ r: 3, strokeWidth: 2, fill: "#fff", stroke: INK }}
                                    activeDot={{ r: 5, fill: INK, stroke: "#fff", strokeWidth: 2 }}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Surface>

            <Surface className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-body-sm font-medium text-ink">탄수화물·단백질·지방</p>
                    <ul className="flex gap-3 text-caption text-ink-2" aria-label="범례">
                        {MACRO_SERIES.map((series) => (
                            <li key={series.key} className="flex items-center gap-1.5">
                                <LegendSwatch color={series.color} dash={series.dash} />
                                {series.label}
                            </li>
                        ))}
                    </ul>
                </div>
                {loading ? (
                    <Skeleton className="h-40 w-full" />
                ) : (
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                <CartesianGrid vertical={false} stroke={HAIRLINE} />
                                <XAxis
                                    dataKey="date"
                                    tick={TICK}
                                    tickLine={false}
                                    axisLine={{ stroke: HAIRLINE }}
                                    interval={period === 7 ? 0 : "preserveStartEnd"}
                                    dy={4}
                                />
                                <YAxis tick={TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${v}g`} />
                                <Tooltip
                                    formatter={(value, name) => {
                                        const label = name === "carbsG" ? "탄수화물" : name === "proteinG" ? "단백질" : "지방"
                                        return [`${Number(value).toFixed(1)}g`, label]
                                    }}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.rawDate ?? ""}
                                    contentStyle={CHART_STYLE}
                                    itemStyle={{ color: INK }}
                                    cursor={{ stroke: HAIRLINE }}
                                />
                                {MACRO_SERIES.map((series) => (
                                    <Line
                                        key={series.key}
                                        type="monotone"
                                        dataKey={series.key}
                                        stroke={series.color}
                                        strokeWidth={2}
                                        strokeDasharray={series.dash}
                                        dot={{ r: 2.5, fill: "#fff", stroke: series.color, strokeWidth: 1.5 }}
                                        connectNulls={false}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Surface>
        </Section>
    )
}
