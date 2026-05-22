import AxiosController from "@/lib/axios/AxiosController"
import { RoutineDraft, RoutineBlock, RoutineFinalResponse } from "@/types/routine"
import { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { guardGenerateResponse, guardFinalizeResponse } from "@/utils/responseGuard"
import { Page } from "@/types/project"

// Golden 계약 기준: finalRoutinePayload는 전체 draft가 아닌 routineBlocks 중심 clean payload
export interface FinalizeCleanPayload {
    routineBlocks: RoutineBlock[]
}

export interface FinalizePayload {
    targetWorkoutDate: string
    finalRoutinePayload: FinalizeCleanPayload
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
        const result = await AxiosController.post<{ routineFinalId: string; targetSplitLabel?: string }>(
            `/api/routines/drafts/${draftId}/finalize`,
            payload
        )
        const finalId = result.routineFinalId ?? null
        guardFinalizeResponse(finalId)
        if (result.targetSplitLabel) {
            localStorage.setItem("fitcore_split_label", result.targetSplitLabel)
        }
        return finalId
    },

    getMyFinals: (page = 0, size = 20): Promise<Page<RoutineFinalResponse>> =>
        AxiosController.get<Page<RoutineFinalResponse>>(
            `/api/routines/finals?page=${page}&size=${size}`
        ),
}

export default routineApiClient
