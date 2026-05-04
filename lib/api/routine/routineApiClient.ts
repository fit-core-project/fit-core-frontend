import AxiosController from "@/lib/axios/AxiosController"
import { RoutineDraft } from "@/types/routine"
import { RoutineGenerateRequest } from "@/utils/requestAssembler"

export interface FinalizePayload {
    targetWorkoutDate: string
    finalRoutinePayload: RoutineDraft
    acceptedWithoutEdits: boolean
    userEditSummary: string[]
}

const routineApiClient = {
    generate: (request: RoutineGenerateRequest): Promise<RoutineDraft> =>
        AxiosController.post<RoutineDraft>("/api/routines/generate", request),

    finalize: async (draftId: string, payload: FinalizePayload): Promise<string | null> => {
        const result = await AxiosController.post<{ routineFinalId?: string; id?: string }>(
            `/api/routines/drafts/${draftId}/finalize`,
            payload
        )
        return result.routineFinalId ?? result.id ?? null
    },
}

export default routineApiClient
