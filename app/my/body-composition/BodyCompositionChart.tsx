import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BodyComposition } from "@/types/project"

interface BodyCompositionChartProps {
    data: BodyComposition[]
    weightUnit: "kg" | "lbs"
}

interface MetricConfig {
    key: "weight" | "muscle" | "fatPct"
    label: string
    unit: string
}

// Same hex values as the @theme tokens in app/globals.css (recharts needs literal colors).
const INK = "#14213d"
const INK_2 = "#5b6478"
const HAIRLINE = "#e3e7ee"
const RAIL = "#c9d1de"

const TICK = { fontSize: 12, fill: INK_2 }

const formatDate = (value?: string) => {
    if (!value) return ""
    const [, month, day] = value.split("-")
    return month && day ? `${month}/${day}` : value
}

const getDomain = (values: number[]): [number, number] => {
    if (values.length === 0) return [0, 1]

    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = max - min
    const padding = spread === 0 ? Math.max(1, Math.abs(max) * 0.03) : spread * 0.35

    return [Number((min - padding).toFixed(1)), Number((max + padding).toFixed(1))]
}

export default function BodyCompositionChart({ data, weightUnit }: BodyCompositionChartProps) {
    const metrics: MetricConfig[] = [
        { key: "weight", label: "체중", unit: weightUnit },
        { key: "muscle", label: "골격근량", unit: weightUnit },
        { key: "fatPct", label: "체지방률", unit: "%" },
    ]

    const toDisplay = (kg: number | undefined): number | undefined => {
        if (kg == null) return undefined
        return weightUnit === "lbs" ? +(kg * 2.20462).toFixed(1) : kg
    }

    const chartData = useMemo(() => {
        return [...data]
            .sort((a, b) => {
                const aTime = a.measuredAt ? new Date(a.measuredAt).getTime() : 0
                const bTime = b.measuredAt ? new Date(b.measuredAt).getTime() : 0
                return aTime - bTime
            })
            .map((item) => ({
                date: formatDate(item.measuredAt),
                rawDate: item.measuredAt ?? "",
                weight: toDisplay(item.bodyWeightKg),
                muscle: toDisplay(item.skeletalMuscleMassKg),
                fatPct: item.bodyFatPct,
            }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, weightUnit])

    if (chartData.length === 0) {
        return (
            <p className="flex h-32 items-center justify-center rounded-panel bg-surface px-4 text-center text-body-sm text-ink-2">
                이 기간에는 체성분 기록이 없어요. 표시 기간을 늘려 보세요.
            </p>
        )
    }

    return (
        <div className="flex flex-col divide-y divide-hairline">
            {metrics.map((metric) => {
                const values = chartData
                    .map((item) => item[metric.key])
                    .filter((value): value is number => typeof value === "number")
                const first = values[0]
                const latest = values[values.length - 1]
                const delta = first !== undefined && latest !== undefined ? latest - first : 0
                const isPositive = delta > 0

                return (
                    <div key={metric.key} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                            <h3 className="text-body-sm font-bold text-ink">{metric.label}</h3>
                            <p className="text-right tabular-nums">
                                <span className="text-body font-bold text-ink">
                                    {latest?.toFixed(1) ?? "-"}
                                    <span className="ml-0.5 text-caption font-medium text-ink-2">{metric.unit}</span>
                                </span>
                                <span className="ml-2 text-caption text-ink-2">
                                    {delta === 0 ? "변화 없음" : `기간 중 ${isPositive ? "+" : ""}${delta.toFixed(1)}${metric.unit}`}
                                </span>
                            </p>
                        </div>

                        <div className="h-24 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                                    <CartesianGrid vertical={false} stroke={HAIRLINE} />
                                    <XAxis
                                        dataKey="date"
                                        tick={TICK}
                                        tickLine={false}
                                        axisLine={{ stroke: HAIRLINE }}
                                        interval="preserveStartEnd"
                                        dy={4}
                                    />
                                    <YAxis
                                        tick={TICK}
                                        domain={getDomain(values)}
                                        tickLine={false}
                                        axisLine={false}
                                        width={44}
                                        tickFormatter={(value) => Number(value).toFixed(1)}
                                    />
                                    {first !== undefined && <ReferenceLine y={first} stroke={RAIL} strokeDasharray="4 4" />}
                                    <Tooltip
                                        formatter={(value) => [`${Number(value).toFixed(1)}${metric.unit}`, metric.label]}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.rawDate ?? ""}
                                        cursor={{ stroke: HAIRLINE }}
                                        contentStyle={{
                                            borderRadius: "6px",
                                            border: `1px solid ${HAIRLINE}`,
                                            boxShadow: "none",
                                            fontSize: "12px",
                                            color: INK,
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={metric.key}
                                        stroke={INK}
                                        strokeWidth={2}
                                        dot={{ r: 3, strokeWidth: 2, fill: "#fff", stroke: INK }}
                                        activeDot={{ r: 5, fill: INK, stroke: "#fff", strokeWidth: 2 }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
