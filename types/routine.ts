export type GenerationStatus = "success" | "fallback" | "failed"
export type StatusReasonCode =
    | "none"
    | "llmTimeout"
    | "schemaError"
    | "networkError"
    | "emptyCandidate"
    | "ai_server_unavailable"
    | "ai_timeout"
    | "ai_connection_refused"
    | "ai_bad_response"
    | "ai_schema_mismatch"
    | "ai_remote_error"
    | "ai_disabled"
    | "unknown_ai_error"

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
    // UI-only drag/sort identifier. Strip before sending public finalize payloads.
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

export interface FinalRoutinePayload {
    fallback: boolean
    generationStatus: GenerationStatus
    statusReasonCode: StatusReasonCode
    rationaleSummary: string[]
    routineBlocks: RoutineBlock[]
    summaryTitle: string
    totalEstimatedTime: number
    warnings: string[]
}

export interface RoutineFinalResponse {
    routineFinalId: string
    routineDraftId: string
    userId: string
    targetWorkoutDate: string
    targetSplitLabel: string
    finalRoutinePayload: FinalRoutinePayload
    acceptedWithoutEdits: boolean
    userEditSummary: string[]
    savedAt: string
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
