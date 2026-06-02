import { RoutineDraft, RoutineBlock, GenerationStatus, StatusReasonCode } from "../types/routine"

// Path A (Golden): 백엔드가 render-ready routineBlocks[]를 내려줄 때의 응답 shape
interface RawAiResponse {
    routineDraftId: string
    generationStatus?: string
    statusReasonCode?: string
    isFallback?: boolean
    totalEstimatedTime?: number
    summaryTitle?: string
    rationaleSummary?: string | string[]
    warnings?: string[]
    routineBlocks?: unknown[]
}

interface AdapterContext {
    isFallback?: boolean
    status?: GenerationStatus
    reasonCode?: StatusReasonCode
}

function normalizeRationaleSummary(raw: string | string[] | undefined, fallback: string): string[] {
    if (Array.isArray(raw)) return raw.map(String)
    if (raw) return [String(raw)]
    return [fallback]
}

export function normalizeRoutineResponse(rawData: unknown, context: AdapterContext = {}): RoutineDraft {
    const contextFallback = context.isFallback ?? false
    const contextStatus = context.status ?? (contextFallback ? "fallback" : "success")
    const contextReasonCode = context.reasonCode ?? "none"

    const safeData =
        typeof rawData === "object" && rawData !== null ? (rawData as RawAiResponse) : ({} as RawAiResponse)

    if (!Array.isArray(safeData.routineBlocks)) {
        throw new Error(
            `[normalizeRoutineResponse] Missing routineBlocks[] in response — ` +
                `backend must return routineBlocks. Got: ${JSON.stringify(safeData)}`
        )
    }

    if (typeof safeData.routineDraftId !== "string" || safeData.routineDraftId.length === 0) {
        throw new Error(
            `[normalizeRoutineResponse] Missing routineDraftId in golden response — ` +
                `backend must return routineDraftId. Got: ${JSON.stringify(safeData.routineDraftId)}`
        )
    }

    return {
        routineDraftId: safeData.routineDraftId,
        generationStatus: (safeData.generationStatus as GenerationStatus) ?? contextStatus,
        statusReasonCode: (safeData.statusReasonCode as StatusReasonCode) ?? contextReasonCode,
        isFallback: safeData.isFallback ?? contextFallback,
        totalEstimatedTime: Number(safeData.totalEstimatedTime) || 0,
        summaryTitle: String(safeData.summaryTitle || "오늘의 루틴"),
        rationaleSummary: normalizeRationaleSummary(safeData.rationaleSummary, ""),
        warnings: Array.isArray(safeData.warnings) ? safeData.warnings.map(String) : [],
        routineBlocks: safeData.routineBlocks as RoutineBlock[],
    }
}
