export type GenerationStatus = "SUCCESS" | "FALLBACK" | "FAILED"
export type StatusReasonCode = "OK" | "LLM_TIMEOUT" | "SCHEMA_ERROR" | "NETWORK_ERROR"

export interface SetPrescription {
    setIndex: number
    targetReps: number
    targetWeightKg: number | null
    targetRir: number
    targetRestSec: number
}

export interface RoutineBlock {
    exerciseId: string
    exerciseName: string
    exerciseRationale: string
    prescription: SetPrescription[]
    substitutionCandidates?: string[]
}

export interface RoutineDraft {
    routineDraftId: string

    generationStatus: GenerationStatus
    statusReasonCode: StatusReasonCode
    isFallback: boolean

    totalEstimatedTime: number
    summaryTitle: string
    rationaleSummary: string[]
    warnings: string[]
    routineBlocks: RoutineBlock[]
}
