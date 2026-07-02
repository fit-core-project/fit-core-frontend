"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pill } from "lucide-react"
import TodayWorkoutCard from "@/app/components/TodayWorkoutCard"
import DietSummaryCard from "@/app/components/DietSummaryCard"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default function HomePage() {
    const router = useRouter()
    const today = getKstToday()
    const [showManualModal, setShowManualModal] = useState(false)
    const [dietRefreshKey, setDietRefreshKey] = useState(0)

    const handleManualSaved = () => {
        setShowManualModal(false)
        setDietRefreshKey((k) => k + 1)
    }

    return (
        <div className="flex-1 flex flex-col pb-20">
            {showManualModal && (
                <ManualEntryModal
                    defaultDate={today}
                    onClose={() => setShowManualModal(false)}
                    onSaved={handleManualSaved}
                />
            )}
            <div className="bg-white px-6 pt-4 pb-6 rounded-b-3xl shadow-sm border-b border-slate-100">
                <h1 className="text-2xl font-extrabold text-slate-800">오늘도 화이팅하세요!</h1>
            </div>

            <main className="px-5 mt-8 flex flex-col gap-8">
                <TodayWorkoutCard />

                <DietSummaryCard
                    showDetails={false}
                    onManualAdd={() => setShowManualModal(true)}
                    onAiLog={() => router.push("/ai_quicklog")}
                    refreshKey={dietRefreshKey}
                />

                <section>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 px-1">AI 코치 도구</h2>
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => router.push("/ai_supplement")}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <Pill className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-bold text-slate-800">영양제 코치</p>
                                <p className="text-xs text-slate-500 mt-0.5">안전한 복용 가이드 확인</p>
                            </div>
                            <div className="text-slate-300">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                        </button>
                    </div>
                </section>
            </main>
        </div>
    )
}
