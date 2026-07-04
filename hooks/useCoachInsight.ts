"use client"

import { useEffect, useState } from "react"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import programApiClient from "@/lib/api/program/programApiClient"
import { deriveCoachState } from "@/utils/coachInsight"
import { getKstToday } from "@/utils/date"
import type { CoachActiveProgramSignal, CoachInsight, CoachSignals } from "@/types/coach"
import type { ProgramSummaryResponse } from "@/types/program"

function toActiveProgramSignal(program: ProgramSummaryResponse | null): CoachActiveProgramSignal | null {
    if (!program || program.status !== "ACTIVE" || !program.nextItem) return null
    const nextRoutineName =
        program.nextItem.title?.trim() ||
        program.nextItem.targetSplitLabel?.trim() ||
        "다음 루틴"

    return {
        programId: program.programId,
        name: program.name,
        status: program.status,
        currentPosition: program.currentPosition,
        totalItems: program.totalItems,
        nextRoutineName,
        nextRoutineFinalId: program.nextItem.routineFinalId,
        nextProgramItemId: program.nextItem.programItemId,
        estimatedTime: program.nextItem.estimatedTime,
        targetSplitLabel: program.nextItem.targetSplitLabel,
    }
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
            profileApiClient.getMe(),
            programApiClient.getActiveProgram(),
        ]).then(([recentResult, attendanceResult, finalsResult, dietResult, targetResult, profileResult, programResult]) => {
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
            const profile =
                profileResult.status === "fulfilled" ? profileResult.value : null
            const activeProgram =
                programResult.status === "fulfilled" ? toActiveProgramSignal(programResult.value) : null

            const todayWorkoutDone = recentContent.some(
                (s) => String(s.workoutDate).slice(0, 10) === today
            )

            // 이번 주 출석: weekStart/weekEnd가 today를 포함하는 항목, 없으면 첫 번째
            const currentWeek =
                attendance.find((w) => w.weekStart <= today && today <= w.weekEnd) ??
                attendance[0] ??
                null

            const signals: CoachSignals = {
                equipmentEmpty: profile != null && (profile.equipmentAccess?.length ?? 0) === 0,
                finalsTotal: finals?.totalElements ?? 0,
                kcalGoal: target?.kcalGoal ?? null,
                totalKcal: diet != null ? diet.totalKcal : null,
                todayWorkoutDone,
                todayDietLogged: (diet?.items?.length ?? 0) > 0,
                weeklyRate: currentWeek?.rate ?? null,
                actualDays: currentWeek?.actualDays ?? null,
                targetDays: currentWeek?.targetDays ?? null,
                activeProgram,
            }

            setInsight(deriveCoachState(signals))
        }).finally(() => setLoading(false))
    }, [])

    return { insight, loading }
}
