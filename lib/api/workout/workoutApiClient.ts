import AxiosController from "@/lib/axios/AxiosController"
import { Page, WorkoutSessionResponse } from "@/types/project"
import { guardWorkoutSaveRequest } from "@/utils/responseGuard"

export interface WorkoutSetSaveRequest {
    exerciseOrder: number
    exerciseId: string
    exerciseNameSnapshot: string
    setIndex: number
    setType: string
    trackingMode: string
    weightKg: number | null
    reps: number
    rir: number | null      // AI 추천값 (targetRir)
    rpe: number | null      // 사용자 실제 체감값 (운동 후 입력)
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
