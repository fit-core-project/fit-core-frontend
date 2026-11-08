import type { RoutineFinalResponse } from "@/types/routine"
import { splitLabel as splitLabelText, splitTitle } from "@/utils/displayLabels"

export interface RoutineProgramDisplay {
    title: string
    splitLabel: string | null
    exerciseCount: number | null
    exercisePreview: string[]
    savedDateLabel: string | null
    estimatedTime: number | null
}

export function moveSelectedRoutineIds(ids: string[], fromIndex: number, toIndex: number): string[] {
    if (fromIndex === toIndex) return ids
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) return ids
    const next = [...ids]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
}

export function getRoutineProgramDisplay(routine: RoutineFinalResponse): RoutineProgramDisplay {
    const payload = routine.finalRoutinePayload
    const blocks = payload?.routineBlocks ?? []
    const title = payload?.summaryTitle?.trim() || splitTitle(routine.targetSplitLabel) || "저장 루틴"
    const splitLabel = routine.targetSplitLabel?.trim() ? splitLabelText(routine.targetSplitLabel) : null
    const exercisePreview = blocks
        .map((block) => block.exerciseName?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, 3)

    return {
        title,
        splitLabel,
        exerciseCount: blocks.length > 0 ? blocks.length : null,
        exercisePreview,
        savedDateLabel: formatRoutineSavedDate(routine.savedAt),
        estimatedTime: payload?.totalEstimatedTime || null,
    }
}

export function formatRoutineSavedDate(savedAt: string | null | undefined): string | null {
    if (!savedAt) return null
    const datePart = savedAt.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
    return `${datePart.slice(0, 4)}.${datePart.slice(5, 7)}.${datePart.slice(8, 10)} 저장`
}
