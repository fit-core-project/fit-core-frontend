"use client"

import { useEffect, useState } from "react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import { deriveCoachState } from "@/utils/coachInsight"
import type { CoachInsight, CoachSignals } from "@/types/coach"

function getKstToday(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function useCoachInsight(): { insight: CoachInsight | null; loading: boolean } {
    const [insight, setInsight] = useState<CoachInsight | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const today = getKstToday()

        Promise.allSettled([
            workoutApiClient.getRecent(0, 5),
            workoutApiClient.getAttendance(),
            routineApiClient.getMyFinals(0, 1),
            dietApiClient.getToday(),
            nutritionTargetApiClient.getTarget(),
        ]).then(([recentResult, attendanceResult, finalsResult, dietResult, targetResult]) => {
            const recentContent =
                recentResult.status === "fulfilled" ? (recentResult.value.content ?? []) : []
            const attendance =
                attendanceResult.status === "fulfilled" ? attendanceResult.value : []
            const finals =
                finalsResult.status === "fulfilled" ? finalsResult.value : null
            const diet =
                dietResult.status === "fulfilled" ? dietResult.value : null
            const target =
                targetResult.status === "fulfilled" ? targetResult.value : null

            const todayWorkoutDone = recentContent.some(
                (s) => String(s.workoutDate).slice(0, 10) === today
            )

            // 이번 주 출석: weekStart/weekEnd가 today를 포함하는 항목, 없으면 첫 번째
            const currentWeek =
                attendance.find((w) => w.weekStart <= today && today <= w.weekEnd) ??
                attendance[0] ??
                null

            const signals: CoachSignals = {
                finalsTotal: finals?.totalElements ?? 0,
                kcalGoal: target?.kcalGoal ?? null,
                totalKcal: diet != null ? diet.totalKcal : null,
                todayWorkoutDone,
                todayDietLogged: (diet?.items?.length ?? 0) > 0,
                weeklyRate: currentWeek?.rate ?? null,
                actualDays: currentWeek?.actualDays ?? null,
                targetDays: currentWeek?.targetDays ?? null,
            }

            setInsight(deriveCoachState(signals))
        }).finally(() => setLoading(false))
    }, [])

    return { insight, loading }
}
