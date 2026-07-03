"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Pill } from "lucide-react"
import TodayWorkoutCard from "@/app/components/TodayWorkoutCard"
import DietSummaryCard from "@/app/components/DietSummaryCard"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default function HomePage() {
    const router = useRouter()
    const today = getKstToday()
    useOnboardingGuard()
    const [showManualModal, setShowManualModal] = useState(false)
    const [dietRefreshKey, setDietRefreshKey] = useState(0)

    const handleManualSaved = () => {
        setShowManualModal(false)
        setDietRefreshKey((k) => k + 1)
    }

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-sky-50 via-white to-emerald-50/40 pb-24">
            {showManualModal && (
                <ManualEntryModal
                    defaultDate={today}
                    onClose={() => setShowManualModal(false)}
                    onSaved={handleManualSaved}
                />
            )}
            <div className="px-5 pt-4">
                <div className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-blue-600 via-indigo-500 to-emerald-400 p-[1px] shadow-[0_18px_45px_rgba(37,99,235,0.18)]">
                    <div className="rounded-[27px] bg-white/90 px-5 py-5 backdrop-blur">
                        <div>
                            <p className="text-[11px] font-extrabold uppercase text-blue-600">Fit Core Today</p>
                            <h1 className="mt-2 text-[25px] font-extrabold leading-tight text-slate-950">
                                오늘의 루틴을 가볍게 시작해볼까요?
                            </h1>
                            <p className="mt-2 max-w-[280px] text-sm font-medium leading-5 text-slate-600">
                                운동과 식단 기록을 한 화면에서 이어가세요.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-5 mt-6 flex flex-col gap-7">
                <TodayWorkoutCard />

                <DietSummaryCard
                    showDetails={false}
                    onManualAdd={() => setShowManualModal(true)}
                    onAiLog={() => router.push("/ai_quicklog")}
                    refreshKey={dietRefreshKey}
                />

                <section>
                    <h2 className="mb-3 px-1 text-base font-extrabold text-slate-800">AI 코치 도구</h2>
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => router.push("/ai_supplement")}
                            className="flex min-h-20 items-center gap-3 rounded-3xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-[0_16px_38px_rgba(15,23,42,0.09)]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                                <Pill className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold text-slate-800">영양제 코치</p>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    복용 전 주의사항과 조합을 확인하세요.
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </button>
                    </div>
                </section>
            </main>
        </div>
    )
}
