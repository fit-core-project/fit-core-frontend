export type CoachFocus = "workout" | "diet" | "routine" | "setup" | "done"

export type CoachStateId =
    | "NO_ROUTINE"
    | "NO_KCAL_GOAL"
    | "WORKOUT_DONE_NO_DIET"
    | "WORKOUT_DONE_DIET_OVER"
    | "WORKOUT_DONE_DIET_OK"
    | "NO_WORKOUT_DIET_LOGGED"
    | "LOW_ATTENDANCE"
    | "TODAY_NOT_STARTED"

export interface CoachSignals {
    finalsTotal: number
    kcalGoal: number | null
    totalKcal: number | null
    todayWorkoutDone: boolean
    todayDietLogged: boolean
    weeklyRate: number | null
    actualDays: number | null
    targetDays: number | null
}

export interface CoachInsight {
    stateId: CoachStateId
    focus: CoachFocus
    message: string
    action: { label: string; href: string }
    isAlert: boolean
}
