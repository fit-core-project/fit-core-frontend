export interface RoutineFormState {
    targetMuscles: string[]
    domsData: Record<string, number>
    equipment: string[]
    timeAvailable: number
    painAreas: string[]
    goal: "STRENGTH" | "HYPERTROPHY" | "ENDURANCE"
    userNote: string
}

export interface RoutineGenerateRequest {
    targetMuscles: string[]
    timeAvailableMin: number
    currentPainAreas: string[]
    unavailableEquipment: string[]
    currentDoms: { bodyPart: string; level: string }[]
    goal: string
    userNote: string
}

const ALL_WEIGHTED_EQUIPMENT = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE"] as const

const DOMS_LEVEL_MAP: Record<number, string> = {
    1: "mild",
    2: "moderate",
    3: "severe",
}

export function assembleRoutineRequest(state: Partial<RoutineFormState>): RoutineGenerateRequest {
    const safeTime = state.timeAvailable && state.timeAvailable > 0 ? state.timeAvailable : 60
    const safeGoal = state.goal || "HYPERTROPHY"
    const safeEquipment = state.equipment && state.equipment.length > 0 ? state.equipment : ["BODYWEIGHT"]

    // 유저가 선택하지 않은 유중량 장비 → 블랙리스트
    const unavailableEquipment = ALL_WEIGHTED_EQUIPMENT.filter((eq) => !safeEquipment.includes(eq))

    // DOMS 수치 → 레벨 문자열 객체 배열 (0 또는 매핑 불가한 값은 제외)
    const domsEntries = Object.entries(state.domsData || {})
    const currentDoms = domsEntries
        .filter(([, value]) => DOMS_LEVEL_MAP[value] !== undefined)
        .map(([bodyPart, value]) => ({
            bodyPart,
            level: DOMS_LEVEL_MAP[value],
        }))

    return {
        targetMuscles: state.targetMuscles || [],
        timeAvailableMin: safeTime,
        currentPainAreas: state.painAreas || [],
        unavailableEquipment,
        currentDoms,
        goal: safeGoal,
        userNote: (state.userNote || "").trim(),
    }
}
