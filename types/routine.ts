export type GenerationStatus = "success" | "fallback" | "failed"
export type StatusReasonCode = "none" | "llmTimeout" | "schemaError" | "networkError" | "emptyCandidate"

export interface SetPrescription {
    setIndex: number
    setType: string
    targetReps: number
    targetWeightKg: number | null
    targetRir: number
    targetRestSec: number
}

export interface SubstitutionCandidate {
    exerciseId: string
    exerciseName: string
    reason: string
}

export interface RoutineBlock {
    order: number
    clientBlockId?: string
    exerciseId: string
    exerciseName: string
    movementPattern?: string
    primaryMuscles?: string[]
    equipmentType?: string
    defaultRestSec?: number
    exerciseRationale: string
    prescription: SetPrescription[]
    substitutionCandidates?: SubstitutionCandidate[]
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
