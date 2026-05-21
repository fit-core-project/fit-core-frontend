import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BodyComposition } from "@/types/project"

interface BodyCompositionChartProps {
    data: BodyComposition[]
}

interface MetricConfig {
    key: "weight" | "muscle" | "fatPct"
    label: string
    unit: string
    color: string
    value: (item: BodyComposition) => number | undefined
}

const metrics: MetricConfig[] = [
    {
        key: "weight",
        label: "체중",
        unit: "kg",
        color: "#2563eb",
        value: (item) => item.bodyWeightKg,
    },
    {
        key: "muscle",
        label: "골격근량",
        unit: "kg",
        color: "#16a34a",
        value: (item) => item.skeletalMuscleMassKg,
    },
    {
        key: "fatPct",
        label: "체지방률",
        unit: "%",
        color: "#e11d48",
        value: (item) => item.bodyFatPct,
    },
]

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

export default function BodyCompositionChart({ data }: BodyCompositionChartProps) {
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
                weight: item.bodyWeightKg,
                muscle: item.skeletalMuscleMassKg,
                fatPct: item.bodyFatPct,
            }))
    }, [data])

    if (chartData.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-400">
                체성분 기록이 없습니다.
            </div>
        )
    }

    return (
        <div className="space-y-2.5">
            {metrics.map((metric) => {
                const values = chartData
                    .map((item) => item[metric.key])
                    .filter((value): value is number => typeof value === "number")
                const first = values[0]
                const latest = values[values.length - 1]
                const delta = first !== undefined && latest !== undefined ? latest - first : 0
                const isPositive = delta > 0
                const isNegative = delta < 0

                return (
                    <div key={metric.key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2">
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                            <div>
                                <h3 className="text-xs font-extrabold text-slate-800">{metric.label}</h3>
                                <p className="text-[10px] font-medium text-slate-400">{metric.unit} 기준 변화</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-extrabold text-slate-900">
                                    {latest?.toFixed(1) ?? "-"}
                                    <span className="ml-0.5 text-[10px]">{metric.unit}</span>
                                </p>
                                <p
                                    className={`text-[11px] font-bold ${
                                        isPositive
                                            ? "text-emerald-600"
                                            : isNegative
                                              ? "text-rose-600"
                                              : "text-slate-400"
                                    }`}
                                >
                                    {delta === 0
                                        ? "변화 없음"
                                        : `${isPositive ? "+" : ""}${delta.toFixed(1)}${metric.unit}`}
                                </p>
                            </div>
                        </div>

                        <div className="h-20 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                        dy={4}
                                    />
                                    <YAxis
                                        fontSize={9}
                                        domain={getDomain(values)}
                                        tickLine={false}
                                        axisLine={false}
                                        width={34}
                                        tickFormatter={(value) => Number(value).toFixed(1)}
                                    />
                                    {first !== undefined && (
                                        <ReferenceLine y={first} stroke="#cbd5e1" strokeDasharray="4 4" />
                                    )}
                                    <Tooltip
                                        formatter={(value) => [
                                            `${Number(value).toFixed(1)}${metric.unit}`,
                                            metric.label,
                                        ]}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.rawDate ?? ""}
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "none",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={metric.key}
                                        stroke={metric.color}
                                        strokeWidth={2.5}
                                        dot={{ r: 2.5, strokeWidth: 1.5, fill: "#fff" }}
                                        activeDot={{ r: 4 }}
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
