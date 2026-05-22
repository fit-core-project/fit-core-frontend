import AxiosController from "@/lib/axios/AxiosController"
import { AttendanceWeekResponse, Page, PrResponse, WorkoutSessionResponse } from "@/types/project"
import { guardWorkoutSaveRequest } from "@/utils/responseGuard"
import { demoProfile, getDemoRecentWorkouts, isDemoMode } from "@/utils/demoMode"

export interface WorkoutSetSaveRequest {
    exerciseOrder: number
    exerciseId: string
    exerciseNameSnapshot: string
    setIndex: number
    setType: string
    trackingMode: string
    weightKg: number | null
    reps: number
    rir: number | null // AI 추천값 (targetRir)
    rpe: number | null // 사용자 실제 체감값 (운동 후 입력)
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
        if (isDemoMode()) {
            const saved = getDemoRecentWorkouts(0, 100).content
            const now = new Date().toISOString()
            localStorage.setItem(
                "fitcore_demo_workouts",
                JSON.stringify([
                    {
                        id: `demo-workout-${Date.now()}`,
                        userId: demoProfile.userId,
                        workoutDate: request.workoutDate,
                        splitLabel: request.splitLabel,
                        routineName: request.splitLabel,
                        title: request.splitLabel,
                        sourceRoutineFinalId: request.sourceRoutineFinalId ?? "demo-final-local",
                        timeAvailableMin: request.timeAvailableMin,
                        durationMin: request.durationMin,
                        readinessLevel: request.readinessLevel,
                        currentPainAreas: request.currentPainAreas,
                        currentDoms: request.currentDoms,
                        unavailableEquipment: request.unavailableEquipment,
                        sessionNote: "",
                        createdAt: now,
                        updatedAt: now,
                        sets: request.sets.map((set, index) => ({
                            id: `demo-saved-set-${Date.now()}-${index}`,
                            ...set,
                            setType: "working",
                            trackingMode: set.trackingMode,
                            weightKg: set.weightKg ?? 0,
                            rpe: set.rpe ?? 0,
                            rir: set.rir ?? 0,
                            setNote: "",
                        })),
                    },
                    ...saved,
                ])
            )
            return Promise.resolve()
        }
        return AxiosController.post("/api/workouts", request)
    },

    getRecent: (page: number = 0, size: number = 10): Promise<Page<WorkoutSessionResponse>> =>
        isDemoMode()
            ? Promise.resolve(getDemoRecentWorkouts(page, size))
            : AxiosController.get<Page<WorkoutSessionResponse>>(`/api/workouts/recent?page=${page}&size=${size}`),

    getPrs: (): Promise<PrResponse[]> =>
        isDemoMode()
            ? Promise.resolve([])
            : AxiosController.get<PrResponse[]>("/api/workouts/prs"),

    getAttendance: (): Promise<AttendanceWeekResponse[]> =>
        isDemoMode()
            ? Promise.resolve([])
            : AxiosController.get<AttendanceWeekResponse[]>("/api/workouts/attendance"),
}

export default workoutApiClient
