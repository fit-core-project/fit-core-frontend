import { RoutineDraft, RoutineBlock, SetPrescription, GenerationStatus, StatusReasonCode } from "../types/routine"

// 백엔드가 to_camel 적용 후 내려주는 camelCase 응답 형태
interface RawAiResponse {
    totalEstimatedTime?: number
    summaryTitle?: string
    rationaleSummary?: string | string[]
    warnings?: string[]
    exercises?: any[]
}

interface AdapterContext {
    draftId?: string
    isFallback?: boolean
    status?: GenerationStatus
    reasonCode?: StatusReasonCode
}

export function normalizeRoutineResponse(rawData: any, context: AdapterContext = {}): RoutineDraft {
    const isFallback = context.isFallback ?? false
    const generationStatus = context.status ?? (isFallback ? "FALLBACK" : "SUCCESS")
    const reasonCode = context.reasonCode ?? "OK"
    const draftId = context.draftId ?? `draft_${crypto.randomUUID().slice(0, 8)}`

    const safeData = typeof rawData === "object" && rawData !== null ? (rawData as RawAiResponse) : {}

    const rawExercises = Array.isArray(safeData.exercises) ? safeData.exercises : []

    const routineBlocks: RoutineBlock[] = rawExercises.map((ex, index) => {
        const rawPrescription = Array.isArray(ex?.prescription) ? ex.prescription : []

        const prescription: SetPrescription[] = rawPrescription.length > 0
            ? rawPrescription.map((p: any, i: number) => ({
                setIndex: Number(p?.setIndex ?? i),
                targetReps: Number(p?.targetReps) || 10,
                targetWeightKg: typeof p?.targetWeightKg === "number" ? p.targetWeightKg : null,
                targetRir: Number(p?.targetRir ?? 2),
                targetRestSec: Number(p?.targetRestSec) || 60,
            }))
            : [{
                setIndex: 0,
                targetReps: 10,
                targetWeightKg: null,
                targetRir: 2,
                targetRestSec: 60,
            }]

        return {
            id: `blk_${crypto.randomUUID().slice(0, 8)}_${index}`,
            exerciseName: String(ex?.exerciseName || "이름 없는 기본 운동"),
            exerciseRationale: String(ex?.exerciseRationale || "안전한 자세로 수행하세요."),
            prescription,
        }
    })

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
