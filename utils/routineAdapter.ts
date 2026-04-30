import { RoutineDraft, RoutineBlock, SetPrescription, GenerationStatus, StatusReasonCode } from "../types/routine"

// Golden response: routineDraftId + routineBlocks 직접 포함
// Legacy fallback: exercises 배열 (Gemini direct 또는 구형 백엔드)
interface RawAiResponse {
    routineDraftId?: string
    totalEstimatedTime?: number
    summaryTitle?: string
    rationaleSummary?: string | string[]
    warnings?: string[]
    routineBlocks?: any[]
    exercises?: any[]
}

interface AdapterContext {
    draftId?: string
    isFallback?: boolean
    status?: GenerationStatus
    reasonCode?: StatusReasonCode
}

function normalizePrescription(rawPrescription: any[]): SetPrescription[] {
    if (rawPrescription.length === 0) {
        return [{ setIndex: 0, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 60 }]
    }
    return rawPrescription.map((p: any, i: number) => ({
        setIndex: Number(p?.setIndex ?? i),
        targetReps: Number(p?.targetReps) || 10,
        targetWeightKg: typeof p?.targetWeightKg === "number" ? p.targetWeightKg : null,
        targetRir: Number(p?.targetRir ?? 2),
        targetRestSec: Number(p?.targetRestSec) || 60,
    }))
}

export function normalizeRoutineResponse(rawData: any, context: AdapterContext = {}): RoutineDraft {
    const isFallback = context.isFallback ?? false
    const generationStatus = context.status ?? (isFallback ? "FALLBACK" : "SUCCESS")
    const reasonCode = context.reasonCode ?? "OK"

    const safeData = typeof rawData === "object" && rawData !== null ? (rawData as RawAiResponse) : {}

    // Golden response: routineDraftId를 응답에서 직접 수용, 없으면 생성
    const draftId = safeData.routineDraftId ?? context.draftId ?? `draft_${crypto.randomUUID().slice(0, 8)}`

    // Golden response: routineBlocks 우선, 구형 exercises 배열을 fallback으로 사용
    const rawBlocks = Array.isArray(safeData.routineBlocks) ? safeData.routineBlocks
        : Array.isArray(safeData.exercises) ? safeData.exercises
        : []

    const routineBlocks: RoutineBlock[] = rawBlocks.map((ex, index) => ({
        id: ex?.id ?? `blk_${crypto.randomUUID().slice(0, 8)}_${index}`,
        exerciseName: String(ex?.exerciseName || "이름 없는 기본 운동"),
        exerciseRationale: String(ex?.exerciseRationale || "안전한 자세로 수행하세요."),
        prescription: normalizePrescription(Array.isArray(ex?.prescription) ? ex.prescription : []),
    }))

    // rationaleSummary: 백엔드가 string 또는 string[]로 올 수 있으므로 항상 배열로 정규화
    const rawRationale = safeData.rationaleSummary
    const rationaleSummary: string[] = Array.isArray(rawRationale)
        ? rawRationale.map(String)
        : rawRationale
        ? [String(rawRationale)]
        : ["AI 코멘트를 불러올 수 없습니다."]

    return {
        routineDraftId: draftId,
        generationStatus,
        statusReasonCode: reasonCode,
        isFallback,
        totalEstimatedTime: Number(safeData.totalEstimatedTime) || 0,
        summaryTitle: String(safeData.summaryTitle || "오늘의 루틴"),
        rationaleSummary,
        warnings: Array.isArray(safeData.warnings) ? safeData.warnings.map(String) : [],
        routineBlocks,
    }
}
