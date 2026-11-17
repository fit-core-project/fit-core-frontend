import AxiosController from "@/lib/axios/AxiosController"
import type {
    ProgramCreateRequest,
    ProgramDetailResponse,
    ProgramSummaryResponse,
    ProgramUpdateRequest,
} from "@/types/program"
import { isDemoMode } from "@/utils/demoMode"
import {
    activateDemoProgram,
    archiveDemoProgram,
    createDemoProgram,
    deleteDemoProgramPermanently,
    getDemoActiveProgram,
    getDemoProgram,
    getDemoPrograms,
    updateDemoProgram,
} from "@/utils/demoProgramStore"

/** Demo mode (테스트 모드) keeps programs in this browser (utils/demoProgramStore), never on the shared demo account. */
const programApiClient = {
    createProgram: async (request: ProgramCreateRequest): Promise<ProgramDetailResponse> => {
        if (isDemoMode()) return createDemoProgram(request)
        return AxiosController.post<ProgramDetailResponse>("/api/programs", request)
    },

    updateProgram: async (programId: string, request: ProgramUpdateRequest): Promise<ProgramDetailResponse> => {
        if (isDemoMode()) return updateDemoProgram(programId, request)
        return AxiosController.patch<ProgramDetailResponse>(`/api/programs/${programId}`, request)
    },

    getActiveProgram: async (): Promise<ProgramSummaryResponse | null> => {
        if (isDemoMode()) return getDemoActiveProgram()
        const data = await AxiosController.get<ProgramSummaryResponse | "" | null>("/api/programs/active")
        return data || null
    },

    getProgram: async (programId: string): Promise<ProgramDetailResponse> => {
        if (isDemoMode()) return getDemoProgram(programId)
        return AxiosController.get<ProgramDetailResponse>(`/api/programs/${programId}`)
    },

    getPrograms: async (): Promise<ProgramSummaryResponse[]> => {
        if (isDemoMode()) return getDemoPrograms()
        return AxiosController.get<ProgramSummaryResponse[]>("/api/programs")
    },

    archiveProgram: async (programId: string): Promise<ProgramDetailResponse> => {
        if (isDemoMode()) return archiveDemoProgram(programId)
        return AxiosController.delete<ProgramDetailResponse>(`/api/programs/${programId}`)
    },

    activateProgram: async (programId: string): Promise<ProgramDetailResponse> => {
        if (isDemoMode()) return activateDemoProgram(programId)
        return AxiosController.patch<ProgramDetailResponse>(`/api/programs/${programId}/activate`)
    },

    deleteProgramPermanently: async (programId: string): Promise<void> => {
        if (isDemoMode()) return deleteDemoProgramPermanently(programId)
        return AxiosController.delete<void>(`/api/programs/${programId}/permanent`)
    },
}

export default programApiClient
