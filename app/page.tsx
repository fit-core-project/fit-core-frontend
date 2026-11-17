"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Pill } from "lucide-react"
import TodayWorkoutCard from "@/app/components/TodayWorkoutCard"
import CoachInsightCard from "@/app/components/CoachInsightCard"
import DietSummaryCard from "@/app/components/DietSummaryCard"
import ManualEntryModal from "@/app/my/nutrition/ManualEntryModal"
import { getKstToday } from "@/utils/date"
import { Section } from "@/components/ui"

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
        <div className="flex flex-1 flex-col gap-7 bg-ground px-4 pb-24 pt-5">
            {showManualModal && <ManualEntryModal defaultDate={today} onClose={() => setShowManualModal(false)} onSaved={handleManualSaved} />}
            <h1 className="sr-only">홈</h1>

            <TodayWorkoutCard />

            <CoachInsightCard />

            <DietSummaryCard
                showDetails={false}
                onManualAdd={() => setShowManualModal(true)}
                onAiLog={() => router.push("/ai_quicklog")}
                refreshKey={dietRefreshKey}
            />

            <Section title="코치 도구">
                <Link
                    href="/ai_supplement"
                    className="flex min-h-16 items-center gap-3 rounded-panel border border-hairline bg-ground px-4 py-3 hover:bg-surface"
                >
                    <Pill className="size-5 shrink-0 text-ink-2" aria-hidden />
                    <span className="min-w-0 flex-1">
                        <span className="block text-body font-bold text-ink">영양제 코치</span>
                        <span className="block text-body-sm text-ink-2">복용 전 주의사항과 조합을 확인해요.</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                </Link>
            </Section>
        </div>
    )
}
