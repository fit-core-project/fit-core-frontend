import type { RoutineDraft, RoutineFinalResponse } from "@/types/routine"
import { clearProgramContext } from "@/utils/programContext"
import { needsOverwriteConfirm, OVERWRITE_CONFIRM_COPY, writeActiveRoutine } from "@/utils/activeWorkout"

export const PLAYER_PATH = "/ai_routine/player"

/** Converts a saved routine into the player's active draft shape. */
export function finalRoutineToDraft(routine: RoutineFinalResponse): RoutineDraft {
    const payload = routine.finalRoutinePayload
    return {
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
}

function defaultConfirmOverwrite(): boolean {
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true
    return window.confirm(
        `${OVERWRITE_CONFIRM_COPY.title}. ${OVERWRITE_CONFIRM_COPY.description}\n확인: 새로 시작 / 취소: 진행 중인 운동 이어서 하기`,
    )
}

/**
 * Stores a saved routine as the player's active routine and returns the player path.
 * If an unfinished workout exists, `confirmOverwrite` decides (callers with their own confirmation sheet
 * pass `() => true`; others fall back to a native confirm). Declining keeps the unfinished workout,
 * so the returned path resumes it.
 */
export function prepareFinalRoutineForPlay(
    routine: RoutineFinalResponse,
    options: { confirmOverwrite?: () => boolean } = {},
): string {
    if (needsOverwriteConfirm() && !(options.confirmOverwrite ?? defaultConfirmOverwrite)()) return PLAYER_PATH
    clearProgramContext()
    writeActiveRoutine(finalRoutineToDraft(routine), { finalId: routine.routineFinalId, splitLabel: routine.targetSplitLabel ?? null })
    return PLAYER_PATH
}
