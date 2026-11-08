import type { RoutineDraft, RoutineFinalResponse } from "@/types/routine"
import { clearProgramContext } from "@/utils/programContext"

export const PLAYER_PATH = "/ai_routine/player"

/** Converts a saved routine into the player's active draft and stores it. Returns the player path. */
export function prepareFinalRoutineForPlay(routine: RoutineFinalResponse): string {
    const payload = routine.finalRoutinePayload
    const draft: RoutineDraft = {
        routineDraftId: routine.routineDraftId,
        generationStatus: payload.generationStatus,
        statusReasonCode: payload.statusReasonCode,
        isFallback: payload.fallback,
        totalEstimatedTime: payload.totalEstimatedTime,
        summaryTitle: payload.summaryTitle,
        rationaleSummary: payload.rationaleSummary ?? [],
        warnings: payload.warnings ?? [],
        routineBlocks: payload.routineBlocks,
    }
    clearProgramContext()
    localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))
    localStorage.setItem("fitcore_routine_final_id", routine.routineFinalId)
    if (routine.targetSplitLabel) localStorage.setItem("fitcore_split_label", routine.targetSplitLabel)
    else localStorage.removeItem("fitcore_split_label")
    return PLAYER_PATH
}
