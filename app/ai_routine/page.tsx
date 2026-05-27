"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Activity, ArrowRight } from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel"
import { getUserPainProfile } from "@/services/userDataService"

const LOCKED_PAIN_MESSAGE = "해당 부위는 프로필에서 수정 가능합니다"

export default function RoutineHome() {
    const router = useRouter()
    const [domsData, setDomsData] = useState<Record<string, number>>(() => {
        if (typeof window === "undefined") return {}
        const raw = localStorage.getItem("fitcore_doms_data")
        if (!raw) return {}
        try { return JSON.parse(raw) as Record<string, number> } catch { return {} }
    })
    const [painAreas, setPainAreas] = useState<string[]>([])
    const [toastMessage, setToastMessage] = useState("")

    useEffect(() => {
        getUserPainProfile()
            .then((profile) => setPainAreas([...profile.painAreas]))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!toastMessage) return
        const timer = window.setTimeout(() => setToastMessage(""), 2000)
        return () => window.clearTimeout(timer)
    }, [toastMessage])

    const showLockedPainToast = () => {
        setToastMessage(LOCKED_PAIN_MESSAGE)
    }

    const handleMuscleClick = (muscleName: string) => {
        if (painAreas.includes(muscleName)) {
            showLockedPainToast()
            return
        }

        setDomsData((prev) => {
            const current = prev[muscleName] || 0
            const next = (current + 1) % 3  // 0(정상) → 1(뻐근함) → 2(근육통) → 0
            const newData = { ...prev }
            if (next === 0) delete newData[muscleName]
            else newData[muscleName] = next
            return newData
        })
    }

    const handleNext = () => {
        localStorage.setItem("fitcore_doms_data", JSON.stringify(domsData))
        localStorage.setItem("fitcore_pain_areas", JSON.stringify(painAreas))
        router.push("/ai_routine/generator")
    }

    return (
        <div className="flex-1 w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full max-h-[800px] min-h-0 overflow-hidden">
                {toastMessage && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl"
                    >
                        {toastMessage}
                    </div>
                )}
                <div className="bg-blue-50/50 p-6 border-b border-blue-100 shrink-0">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md shadow-blue-200">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-800">컨디션 체크</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {/* 분리된 컴포넌트 사용 */}
                    <AnatomyModel
                        data={domsData}
                        onMuscleClick={handleMuscleClick}
                        mode="doms"
                        lockedMuscles={painAreas}
                    />
                    {painAreas.length > 0 && (
                        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <p className="mb-3 text-xs font-black uppercase tracking-wide text-red-700">
                                Protected Pain Areas
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {painAreas.map((painArea) => (
                                    <span
                                        key={painArea}
                                        role="button"
                                        tabIndex={0}
                                        aria-disabled="true"
                                        className="inline-flex"
                                        onPointerDown={showLockedPainToast}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") showLockedPainToast()
                                        }}
                                    >
                                        <button
                                            type="button"
                                            disabled
                                            aria-disabled="true"
                                            className="pointer-events-none rounded-full border border-red-500 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700"
                                        >
                                            {painArea}
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
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
