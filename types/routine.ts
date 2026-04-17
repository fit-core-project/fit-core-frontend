export type GenerationStatus = "SUCCESS" | "FALLBACK" | "FAILED"
export type StatusReasonCode = "OK" | "LLM_TIMEOUT" | "SCHEMA_ERROR" | "NETWORK_ERROR"

export interface RoutineBlock {
    id: string // UI에서 드래그/삭제/수정을 다루기 위한 클라이언트용 고유 식별자
    exercise_name: string
    target_weight: number | null // 맨몸 운동일 경우 null
    reps: number
    sets: number
    rest_time_sec: number
    coach_tip: string
}

export interface RoutineDraft {
    routine_draft_id: string

    // 상태 관리 (UI에서 뱃지나 에러 메시지를 띄우는 기준)
    generation_status: GenerationStatus
    status_reason_code: StatusReasonCode
    is_fallback: boolean

    // 루틴 본문
    total_estimated_time: number
    rationale_summary: string // AI의 'overall_feedback'이 이쪽으로 매핑됨
    routine_blocks: RoutineBlock[]
}
