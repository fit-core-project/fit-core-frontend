import AxiosController from "@/lib/axios/AxiosController"
import { RoutineDraft } from "@/types/routine"
import { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { guardGenerateResponse, guardFinalizeResponse } from "@/utils/responseGuard"

export interface FinalizePayload {
    targetWorkoutDate: string
    finalRoutinePayload: RoutineDraft
    acceptedWithoutEdits: boolean
    userEditSummary: string[]
}

const routineApiClient = {
    generate: async (request: RoutineGenerateRequest): Promise<RoutineDraft> => {
        const data = await AxiosController.post<unknown>("/api/routines/generate", request)
        guardGenerateResponse(data)
        return data
    },

    finalize: async (draftId: string, payload: FinalizePayload): Promise<string> => {
        const result = await AxiosController.post<{ routineFinalId?: string; id?: string }>(
            `/api/routines/drafts/${draftId}/finalize`,
            payload
        )
        const finalId = result.routineFinalId ?? result.id ?? null
        guardFinalizeResponse(finalId)
        return finalId
    },
}

export default routineApiClient
