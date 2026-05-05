import AxiosController from "@/lib/axios/AxiosController"
import { Page, WorkoutSessionResponse } from "@/types/project"
import { guardWorkoutSaveRequest } from "@/utils/responseGuard"

export interface WorkoutSetSaveRequest {
    exerciseId: string
    exerciseNameSnapshot: string
    setIndex: number
    setType: string
    trackingMode: string
    weightKg: number | null
    reps: number
    rpe: number        // Golden 기준: rpe (내부 SetPrescription의 targetRir에서 매핑)
    isFailure: boolean
    restSec: number
}

export interface WorkoutSaveRequest {
    workoutDate: string
    splitLabel: string
    sourceRoutineFinalId: string | null
    timeAvailableMin: number
    durationMin: number
    readinessLevel: string
    currentPainAreas: string[]
    currentDoms: Array<{ bodyPart: string; level: string }>
    unavailableEquipment: string[]
    sets: WorkoutSetSaveRequest[]
}

const workoutApiClient = {
    save: (request: WorkoutSaveRequest): Promise<void> => {
        guardWorkoutSaveRequest(request)
        return AxiosController.post("/api/workouts", request)
    },

    getRecent: (page: number = 0, size: number = 10): Promise<Page<WorkoutSessionResponse>> =>
        AxiosController.get<Page<WorkoutSessionResponse>>(`/api/workouts/recent?page=${page}&size=${size}`),
}

export default workoutApiClient
