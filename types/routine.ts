export type GenerationStatus = "success" | "fallback" | "failed"
export type StatusReasonCode = "none" | "llmTimeout" | "schemaError" | "networkError"

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
