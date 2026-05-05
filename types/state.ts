export type GenerateState = "idle" | "loading" | "success" | "fallback" | "retryableFailed" | "hardFailed"

export type FinalizeState = "idle" | "loading" | "finalized" | "failed"

export type WorkoutState = "idle" | "inProgress" | "saving" | "saved" | "saveFailed"
