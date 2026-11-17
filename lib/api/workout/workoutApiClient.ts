import AxiosController from "@/lib/axios/AxiosController"
import { AttendanceWeekResponse, Page, PrResponse, WorkoutSessionResponse } from "@/types/project"
import { guardWorkoutSaveRequest } from "@/utils/responseGuard"
import { demoProfile, getAllDemoWorkouts, getDemoRecentWorkouts, isDemoMode } from "@/utils/demoMode"
import { prepareDemoProgramCompletion } from "@/utils/demoProgramStore"
import { demoLocalId, findDemoFinal } from "@/utils/demoRoutineStore"
import { demoAttendance, demoPrs } from "@/utils/demoWorkoutStats"
import { getKstToday } from "@/utils/date"

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
    programId?: string
    programItemId?: string
    timeAvailableMin: number
    durationMin: number
    readinessLevel: string
    currentPainAreas: string[]
    currentDoms: Array<{ bodyPart: string; level: string }>
    unavailableEquipment: string[]
    /** Optional note on the whole session (max 1000 chars on the backend). */
    sessionNote?: string
    sets: WorkoutSetSaveRequest[]
}

const workoutApiClient = {
    save: (request: WorkoutSaveRequest): Promise<void> => {
        guardWorkoutSaveRequest(request)
        if (isDemoMode()) {
            // Program progress is validated before anything is stored, as the backend runs it in the
            // save's transaction: a 400 / 409 there means the session is not saved either.
            let completeProgramItem: ((workoutSessionId: string) => void) | null
            try {
                completeProgramItem = prepareDemoProgramCompletion(
                    request.programId,
                    request.programItemId,
                    request.sourceRoutineFinalId,
                )
            } catch (error) {
                return Promise.reject(error)
            }
            const saved = getAllDemoWorkouts()
            const now = new Date().toISOString()
            const sessionId = demoLocalId("demo-workout")
            const sourceFinal = request.sourceRoutineFinalId ? findDemoFinal(request.sourceRoutineFinalId) : null
            localStorage.setItem(
                "fitcore_demo_workouts",
                JSON.stringify([
                    {
                        id: sessionId,
                        userId: demoProfile.userId,
                        workoutDate: request.workoutDate,
                        splitLabel: request.splitLabel,
                        routineName: request.splitLabel,
                        title: request.splitLabel,
                        ...(sourceFinal ? { targetSplitLabel: sourceFinal.targetSplitLabel } : {}),
                        sourceRoutineFinalId: request.sourceRoutineFinalId ?? "demo-final-local",
                        timeAvailableMin: request.timeAvailableMin,
                        durationMin: request.durationMin,
                        readinessLevel: request.readinessLevel,
                        currentPainAreas: request.currentPainAreas,
                        currentDoms: request.currentDoms,
                        unavailableEquipment: request.unavailableEquipment,
                        sessionNote: request.sessionNote?.trim() ?? "",
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
            completeProgramItem?.(sessionId)
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
            ? Promise.resolve(demoPrs(getDemoRecentWorkouts(0, 100).content))
            : AxiosController.get<PrResponse[]>("/api/workouts/prs"),

    getAttendance: (): Promise<AttendanceWeekResponse[]> =>
        isDemoMode()
            ? Promise.resolve(
                  demoAttendance(getDemoRecentWorkouts(0, 100).content, getKstToday(), demoProfile.trainingDaysPerWeek ?? null),
              )
            : AxiosController.get<AttendanceWeekResponse[]>("/api/workouts/attendance"),
}

export default workoutApiClient
