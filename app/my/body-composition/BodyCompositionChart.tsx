import { useMemo } from "react"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts"
import { BodyComposition } from "@/types/project"

// 컴포넌트 Props 정의
interface BodyCompositionChartProps {
    data: BodyComposition[]
}

export default function BodyCompositionChart({ data }: BodyCompositionChartProps) {
    // 차트용 데이터 가공
    const chartData = useMemo(() => {
        return [...data]
            .slice(0, 7)
            .reverse()
            .map((item) => ({
                name: item.measuredAt ?? "",
                weight: item.bodyWeightKg,
                muscle: item.skeletalMuscleMassKg,
                fat: item.bodyFatMassKg,
            }))
    }, [data])

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis
                        fontSize={12}
                        domain={["auto", "auto"]} // 데이터 범위에 따라 자동으로 조절
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#2563eb"
                        strokeWidth={2}
                        name="체중"
                        dot={{ r: 4 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="muscle"
                        stroke="#16a34a"
                        strokeWidth={2}
                        name="골격근"
                        dot={{ r: 4 }}
                    />
                    <Line type="monotone" dataKey="fat" stroke="#0d9488" strokeWidth={2} name="체지방" dot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
