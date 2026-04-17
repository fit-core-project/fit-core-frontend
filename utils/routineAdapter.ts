import { RoutineDraft, RoutineBlock, GenerationStatus, StatusReasonCode } from "../types/routine"

// AI가 뱉어낼 것으로 기대하는 날것(Raw)의 JSON 형태
interface RawAiResponse {
    total_estimated_time?: number
    overall_feedback?: string
    exercises?: any[] // LLM이 배열이 아닌 객체를 뱉을 위험에 대비해 any 처리
}

// API 호출부에서 파악한 메타데이터 (타임아웃 여부 등)
interface AdapterContext {
    draftId?: string
    isFallback?: boolean
    status?: GenerationStatus
    reasonCode?: StatusReasonCode
}

/**
 * AI의 불안정한 Raw 응답을 안전한 Frontend Domain Type으로 변환합니다.
 */
export function normalizeRoutineResponse(rawData: any, context: AdapterContext = {}): RoutineDraft {
    // 1. 상태 메타데이터 기본값 세팅 (API 호출 레이어에서 주입받음)
    const isFallback = context.isFallback ?? false
    const generationStatus = context.status ?? (isFallback ? "FALLBACK" : "SUCCESS")
    const reasonCode = context.reasonCode ?? "OK"
    const draftId = context.draftId ?? `draft_${crypto.randomUUID().slice(0, 8)}`

    // 2. 방어적 파싱: rawData가 null이거나 엉뚱한 타입일 경우를 대비
    const safeData = typeof rawData === "object" && rawData !== null ? (rawData as RawAiResponse) : {}

    // exercises가 배열이 아니면 빈 배열로 강제 초기화
    const rawExercises = Array.isArray(safeData.exercises) ? safeData.exercises : []

    // 3. 루틴 블록 매핑 (UI용 고유 ID 부여 및 누락 필드 안전 처리)
    const routineBlocks: RoutineBlock[] = rawExercises.map((ex, index) => ({
        id: `blk_${crypto.randomUUID().slice(0, 8)}_${index}`, // UI 리스트 드래그/수정을 위한 고유키
        exercise_name: String(ex?.exercise_name || "이름 없는 기본 운동"),
        target_weight: typeof ex?.target_weight === "number" ? ex.target_weight : null,
        reps: Number(ex?.reps) || 10,
        sets: Number(ex?.sets) || 3,
        rest_time_sec: Number(ex?.rest_time_sec) || 60,
        coach_tip: String(ex?.coach_tip || "안전한 자세로 수행하세요."),
    }))

    // 4. 최종 Domain Type으로 조립 (키 이름 매핑 포함)
    return {
        routine_draft_id: draftId,
        generation_status: generationStatus,
        status_reason_code: reasonCode,
        is_fallback: isFallback,
        total_estimated_time: Number(safeData.total_estimated_time) || 0,
        // 파이썬의 overall_feedback을 프론트의 rationale_summary로 이름 변경
        rationale_summary: String(safeData.overall_feedback || "AI 코멘트를 불러올 수 없습니다."),
        routine_blocks: routineBlocks,
    }
}
