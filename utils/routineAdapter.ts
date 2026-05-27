import { RoutineDraft, RoutineBlock, SetPrescription, GenerationStatus, StatusReasonCode } from "../types/routine"

// Path A (Golden): 백엔드가 render-ready routineBlocks[]를 내려줄 때의 응답 shape
// Path B (Legacy): Gemini direct 또는 구형 백엔드의 exercises[] 응답 shape
interface RawAiResponse {
    routineDraftId: string
    generationStatus?: string
    statusReasonCode?: string
    isFallback?: boolean
    totalEstimatedTime?: number
    summaryTitle?: string
    rationaleSummary?: string | string[]
    warnings?: string[]
    routineBlocks?: unknown[] // Path A: 백엔드 golden
    exercises?: unknown[] // Path B: Gemini direct / 구형 백엔드 (점진적 제거 대상)
}

interface AdapterContext {
    draftId?: string
    isFallback?: boolean
    status?: GenerationStatus
    reasonCode?: StatusReasonCode
}

// Path B 전용: Gemini raw prescription을 FE SetPrescription으로 변환
function normalizePrescription(rawPrescription: unknown[]): SetPrescription[] {
    if (rawPrescription.length === 0) {
        return [{ setIndex: 1, setType: "working", targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 60 }]
    }
    return rawPrescription.map((raw, i: number) => {
        const p = raw as Record<string, unknown>
        return {
            setIndex: Number(p?.setIndex ?? i + 1),
            setType: String(p?.setType ?? "working"),
            targetReps: Number(p?.targetReps) || 10,
            targetWeightKg: typeof p?.targetWeightKg === "number" ? p.targetWeightKg : null,
            targetRir: Number(p?.targetRir ?? 2),
            targetRestSec: Number(p?.targetRestSec) || 60,
        }
    })
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

    // ─── Path A: Golden bypass ────────────────────────────────────────────────
    // 백엔드가 render-ready routineBlocks[]를 내려줄 때:
    // field 재매핑 없이 직통. routineDraftId 누락 시 즉시 에러.
    if (Array.isArray(safeData.routineBlocks)) {
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

    // ─── Path B: Legacy exercises[] ──────────────────────────────────────────
    // Gemini direct 또는 구형 백엔드 대응. routineDraftId 없으면 임시 생성 (dev 전용).
    const draftId = safeData.routineDraftId ?? context.draftId ?? `draft_${crypto.randomUUID().slice(0, 8)}`
    const legacyExercises = Array.isArray(safeData.exercises) ? safeData.exercises : []
    if (contextStatus === "success" && legacyExercises.length === 0) {
        throw new Error("[normalizeRoutineResponse] Missing exercises in legacy success response")
    }

    const routineBlocks: RoutineBlock[] = legacyExercises.map(
        (raw, index: number) => {
            const ex = raw as Record<string, unknown>
            return {
                order: Number(ex?.order ?? index + 1),
                exerciseId: String(ex?.exerciseId ?? `blk_${crypto.randomUUID().slice(0, 8)}_${index}`),
                exerciseName: String(ex?.exerciseName || "이름 없는 기본 운동"),
                exerciseRationale: String(ex?.exerciseRationale || "안전한 자세로 수행하세요."),
                prescription: normalizePrescription(Array.isArray(ex?.prescription) ? ex.prescription as unknown[] : []),
            }
        }
    )

    return {
        routineDraftId: draftId,
        generationStatus: contextStatus,
        statusReasonCode: contextReasonCode,
        isFallback: contextFallback,
        totalEstimatedTime: Number(safeData.totalEstimatedTime) || 0,
        summaryTitle: String(safeData.summaryTitle || "오늘의 루틴"),
        rationaleSummary: normalizeRationaleSummary(safeData.rationaleSummary, "AI 코멘트를 불러올 수 없습니다."),
        warnings: Array.isArray(safeData.warnings) ? safeData.warnings.map(String) : [],
        routineBlocks,
    }
}
