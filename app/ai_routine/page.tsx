"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, ArrowRight } from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel" // 🌟 분리한 컴포넌트 임포트

export default function RoutineHome() {
    const router = useRouter()
    const [domsData, setDomsData] = useState<Record<string, number>>({})

    const handleMuscleClick = (muscleName: string) => {
        setDomsData((prev) => {
            const current = prev[muscleName] || 0
            const next = (current + 1) % 4
            const newData = { ...prev }
            if (next === 0) delete newData[muscleName]
            else newData[muscleName] = next
            return newData
        })
    }

    const handleNext = () => {
        localStorage.setItem("fitcore_doms_data", JSON.stringify(domsData))
        router.push("/ai_routine/generator")
    }

    return (
        <div className="flex-1 w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full max-h-[800px] min-h-0 overflow-hidden">
                <div className="bg-blue-50/50 p-6 border-b border-blue-100 shrink-0">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md shadow-blue-200">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-800">컨디션 체크</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {/* 🌟 분리된 컴포넌트 사용 */}
                    <AnatomyModel data={domsData} onMuscleClick={handleMuscleClick} mode="doms" />
                </div>

                <div className="p-5 bg-white border-t border-slate-100 shrink-0">
                    <button
                        onClick={handleNext}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center"
                    >
                        루틴 세부 설정하기
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    )
}
