export type CoachFocus = "workout" | "diet" | "routine" | "setup" | "done"

export type CoachStateId =
    | "NO_EQUIPMENT"
    | "NO_ROUTINE"
    | "NO_KCAL_GOAL"
    | "WORKOUT_DONE_NO_DIET"
    | "WORKOUT_DONE_DIET_OVER"
    | "WORKOUT_DONE_DIET_OK"
    | "PROGRAM_NEXT_UP"
    | "NO_WORKOUT_DIET_LOGGED"
    | "LOW_ATTENDANCE"
    | "TODAY_NOT_STARTED"

export interface CoachActiveProgramSignal {
    programId: string
    name: string
    status: "ACTIVE" | "COMPLETED" | "ARCHIVED"
    currentPosition: number
    totalItems: number
    nextRoutineName: string | null
    nextRoutineFinalId: string | null
    nextProgramItemId: string | null
    estimatedTime: number | null
    targetSplitLabel: string | null
}

export interface CoachSignals {
    equipmentEmpty: boolean
    finalsTotal: number
    kcalGoal: number | null
    totalKcal: number | null
    todayWorkoutDone: boolean
    todayDietLogged: boolean
    weeklyRate: number | null
    actualDays: number | null
    targetDays: number | null
    activeProgram: CoachActiveProgramSignal | null
}

export interface CoachInsight {
    stateId: CoachStateId
    focus: CoachFocus
    message: string
    description?: string
    action: { label: string; href: string }
    isAlert: boolean
    showAction?: boolean
}
