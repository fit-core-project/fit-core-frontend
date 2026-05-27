import AxiosController from "@/lib/axios/AxiosController"

export interface AdminExercise {
    id: number
    nameKr: string
    nameEn: string
    primaryMuscle: string | null
    secondaryMuscle: string | null
    equipmentReq: string | null
    difficultyTier: number | null
    efficiencyTier: number | null
    painTriggers: string | null
    movementType: string | null
    substituteExerciseIds: string | null
}

export interface ExerciseRequest {
    nameKr: string
    nameEn: string
    primaryMuscle: string
    secondaryMuscle: string
    equipmentReq: string
    difficultyTier: number | null
    efficiencyTier: number | null
    painTriggers: string
    movementType: string
    substituteExerciseIds: string
}

const exerciseAdminClient = {
    getAll: (): Promise<AdminExercise[]> =>
        AxiosController.get("/api/admin/exercises"),

    create: (data: ExerciseRequest): Promise<AdminExercise> =>
        AxiosController.post("/api/admin/exercises", data),

    update: (id: number, data: ExerciseRequest): Promise<AdminExercise> =>
        AxiosController.put(`/api/admin/exercises/${id}`, data),

    delete: (id: number): Promise<void> =>
        AxiosController.delete(`/api/admin/exercises/${id}`),
}

export default exerciseAdminClient
