import AxiosController from "@/lib/axios/AxiosController"
import type {
    ProgramCreateRequest,
    ProgramDetailResponse,
    ProgramSummaryResponse,
} from "@/types/program"

const programApiClient = {
    createProgram: (request: ProgramCreateRequest): Promise<ProgramDetailResponse> =>
        AxiosController.post<ProgramDetailResponse>("/api/programs", request),

    getActiveProgram: async (): Promise<ProgramSummaryResponse | null> => {
        const data = await AxiosController.get<ProgramSummaryResponse | "" | null>("/api/programs/active")
        return data || null
    },

    getProgram: (programId: string): Promise<ProgramDetailResponse> =>
        AxiosController.get<ProgramDetailResponse>(`/api/programs/${programId}`),

    getPrograms: (): Promise<ProgramSummaryResponse[]> =>
        AxiosController.get<ProgramSummaryResponse[]>("/api/programs"),

    archiveProgram: (programId: string): Promise<ProgramDetailResponse> =>
        AxiosController.delete<ProgramDetailResponse>(`/api/programs/${programId}`),

    activateProgram: (programId: string): Promise<ProgramDetailResponse> =>
        AxiosController.patch<ProgramDetailResponse>(`/api/programs/${programId}/activate`),
}

export default programApiClient
