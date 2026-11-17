import type { RoutineDraft } from "@/types/routine"
import type { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { writeActiveRoutine } from "@/utils/activeWorkout"
import { clearProgramContext } from "@/utils/programContext"

export const UNAVAILABLE_EQUIPMENT_KEY = "fitcore_unavailable_equipment"

export type GenerateOutcome =
    | { kind: "cancelled" }
    | { kind: "hardFailed"; reasonCode: string | null }
    | { kind: "ready"; draft: RoutineDraft }

/**
 * Generates a routine and, only when a usable draft comes back, makes it the active routine.
 * The program link of the previous active routine is dropped only after the new routine replaces it:
 * a cancelled, failed or thrown generation leaves the old workout (and its program item) untouched.
 * Network errors are rethrown for the caller to classify.
 */
export async function generateAndCommitRoutine(
    payload: RoutineGenerateRequest,
    generate: (payload: RoutineGenerateRequest) => Promise<RoutineDraft>,
    isCancelled: () => boolean,
): Promise<GenerateOutcome> {
    const draft = await generate(payload)
    if (isCancelled()) return { kind: "cancelled" }
    if (draft.generationStatus === "failed") {
        return { kind: "hardFailed", reasonCode: draft.statusReasonCode ?? null }
    }
    writeActiveRoutine(draft, { finalId: null, splitLabel: payload.targetSplitLabel ?? null })
    clearProgramContext()
    try {
        localStorage.setItem(UNAVAILABLE_EQUIPMENT_KEY, JSON.stringify(payload.unavailableEquipment))
    } catch {
        // Storage can be blocked; the draft page falls back to no equipment filter.
    }
    return { kind: "ready", draft }
}
