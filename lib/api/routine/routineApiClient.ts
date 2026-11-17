import AxiosController from "@/lib/axios/AxiosController"
import { RoutineDraft, RoutineBlock, RoutineFinalResponse } from "@/types/routine"
import { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { guardGenerateResponse, guardFinalizeResponse } from "@/utils/responseGuard"
import { Page } from "@/types/project"
import { isDemoMode } from "@/utils/demoMode"
import { createDemoManualDraft, finalizeDemoRoutine, getDemoFinal, getDemoFinalsPage } from "@/utils/demoRoutineStore"

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

/** Same defaults for a backend manual draft and a demo one. */
function normalizeManualDraft(data: RoutineDraft, title?: string): RoutineDraft {
    return {
        ...data,
        routineBlocks: data.routineBlocks ?? [],
        rationaleSummary: data.rationaleSummary ?? [],
        warnings: data.warnings ?? [],
        totalEstimatedTime: data.totalEstimatedTime ?? 0,
        summaryTitle: data.summaryTitle || title || "새 루틴",
        isFallback: data.isFallback ?? false,
    }
}

/**
 * Demo mode (테스트 모드) keeps saved routines and drafts in this browser (utils/demoRoutineStore): the demo
 * account is shared by every visitor on the backend. generate is the exception and always calls the backend.
 */
const routineApiClient = {
    generate: async (request: RoutineGenerateRequest): Promise<RoutineDraft> => {
        const data = await AxiosController.post<unknown>("/api/routines/generate", request)
        guardGenerateResponse(data)
        return data
    },

    finalize: async (draftId: string, payload: FinalizePayload): Promise<string> => {
        const result = isDemoMode()
            ? finalizeDemoRoutine(draftId, payload)
            : await AxiosController.post<{ routineFinalId: string; targetSplitLabel?: string }>(
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

    getMyFinals: async (page = 0, size = 20): Promise<Page<RoutineFinalResponse>> => {
        if (isDemoMode()) return getDemoFinalsPage(page, size)
        return AxiosController.get<Page<RoutineFinalResponse>>(
            `/api/routines/finals?page=${page}&size=${size}`
        )
    },

    getFinal: async (routineFinalId: string): Promise<RoutineFinalResponse> => {
        if (isDemoMode()) return getDemoFinal(routineFinalId)
        return AxiosController.get<RoutineFinalResponse>(`/api/routines/finals/${routineFinalId}`)
    },

    createManualDraft: async (title?: string): Promise<RoutineDraft> => {
        if (isDemoMode()) return normalizeManualDraft(createDemoManualDraft(title), title)
        const data = await AxiosController.post<RoutineDraft>(
            "/api/routines/drafts/manual",
            title ? { title } : {}
        )
        return normalizeManualDraft(data, title)
    },
}

export default routineApiClient
