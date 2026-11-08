import generateGolden from "@/docs/ops/golden-examples/generate.response.success.golden.json"
import finalizeGolden from "@/docs/ops/golden-examples/finalize.response.golden.json"
import type { Page } from "@/types/project"
import type { RoutineFinalResponse, RoutineDraft } from "@/types/routine"

// Built only from the golden pack: the finalize response supplies the saved routine,
// and the generate response fills the render fields the finalize payload omits.
const draft = generateGolden as unknown as RoutineDraft
const saved = finalizeGolden as unknown as RoutineFinalResponse

export const mockRoutineFinal: RoutineFinalResponse = {
    ...saved,
    finalRoutinePayload: {
        fallback: draft.isFallback,
        generationStatus: draft.generationStatus,
        statusReasonCode: draft.statusReasonCode,
        rationaleSummary: draft.rationaleSummary,
        summaryTitle: draft.summaryTitle,
        totalEstimatedTime: draft.totalEstimatedTime,
        warnings: draft.warnings,
        routineBlocks: saved.finalRoutinePayload.routineBlocks,
    },
}

export const mockRoutineFinalsPage: Page<RoutineFinalResponse> = {
    content: [mockRoutineFinal],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
    first: true,
    numberOfElements: 1,
    empty: false,
}
