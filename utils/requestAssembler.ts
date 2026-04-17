// 1. 프론트엔드 UI 컴포넌트들이 들고 있는 State의 총합 (입력 폼 상태)
export interface RoutineFormState {
    targetMuscles: string[] // 예: ['chest', 'upper-back'] (해부도 라이브러리 원본 값)
    domsData: Record<string, number> // 예: { chest: 2, biceps: 1 }
    equipment: string[] // 예: ['DUMBBELL', 'CABLE']
    timeAvailable: number // 분 단위 (예: 60)
    painAreas: string[] // 관절 등 통증 부위
    goal: "STRENGTH" | "HYPERTROPHY" | "ENDURANCE"
    userNote: string
}

// 2. 백엔드(AI 파이썬 서버)가 기대하는 Request 규격
export interface RoutineGenerateRequest {
    target_muscles: string[]
    equipment: string[]
    time_available_min: number
    pain_areas: string[]
    doms_data: Record<string, number>
    goal: string
    user_note: string
}

/**
 * 파편화된 프론트엔드 UI State를 백엔드 API 요청 규격으로 조립합니다.
 * @param state 폼에서 수집된 UI 상태 객체
 * @returns 안전하게 정제된 Payload
 */
export function assembleRoutineRequest(state: Partial<RoutineFormState>): RoutineGenerateRequest {
    // 1. 기본값 방어 (유저가 입력을 건너뛰었을 때의 안전장치)
    const safeTime = state.timeAvailable && state.timeAvailable > 0 ? state.timeAvailable : 60 // 기본 운동 시간 60분

    const safeGoal = state.goal || "HYPERTROPHY" // 기본 목표 근비대

    // 장비를 아예 안 골랐다면 최소한 '맨몸(BODYWEIGHT)'은 가능하다고 간주
    const safeEquipment = state.equipment && state.equipment.length > 0 ? state.equipment : ["BODYWEIGHT"]

    // 2. Payload 조립
    // 파이썬 서버에 FRONTEND_TO_DB_MAP을 구현해 두었으므로,
    // 'chest' 같은 소문자 명칭을 굳이 대문자 Enum으로 변환하지 않고 그대로 보냅니다.
    return {
        target_muscles: state.targetMuscles || [],
        equipment: safeEquipment,
        time_available_min: safeTime,
        pain_areas: state.painAreas || [],
        doms_data: state.domsData || {},
        goal: safeGoal,
        user_note: (state.userNote || "").trim(),
    }
}
