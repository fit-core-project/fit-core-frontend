import React from "react"

interface StatCardProps {
    label: string
    value: string
    unit: string // 단위를 분리하여 값 뒤에 붙입니다.
    color: string
    icon: React.ReactNode // SVG 컴포넌트를 받습니다.
    diff: {
        text: string // '마스먹 측정면', '마스먹 변경된'
        value?: string // 필요하다면 '+1.2kg' 같은 값 (현재는 이미지에 없으므로 생략 가능)
        type: "up" | "down" | "none" // 화살표 방향
    }
}

export default function StatCard({ label, value, unit, color, icon, diff }: StatCardProps) {
    const getDiffColor = (type: StatCardProps["diff"]["type"]) => {
        if (type === "up") return "text-green-600"
        if (type === "down") return "text-red-600"
        return "text-gray-400"
    }

    return (
        <div className="flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-gray-100 bg-white px-2.5 py-3 text-center shadow-sm">
            {/* 아이콘 영역 (SVG 비율 유지) */}
            <div className={`mb-2 flex h-8 w-8 items-center justify-center ${color}`}>{icon}</div>

            {/* 라벨 (예: 체중) */}
            <span className="mb-1 text-[11px] font-medium text-gray-500">{label}</span>

            {/* 값과 단위 (예: 78.4kg) */}
            <div className="mb-1.5 flex items-baseline">
                <span className="text-xl font-extrabold text-gray-900">{value}</span>
                <span className="ml-0.5 text-xs font-bold text-gray-900">{unit}</span>
            </div>

            <div className={`flex items-center text-[10px] ${getDiffColor(diff.type)} font-medium leading-none`}>
                {/* 컴포넌트 대신 직접 조건부 렌더링 사용 */}
                {diff.type === "up" && <span className="mr-0.5">▲</span>}
                {diff.type === "down" && <span className="mr-0.5">▼</span>}

                <span>{diff.text}</span>
            </div>
        </div>
    )
}
