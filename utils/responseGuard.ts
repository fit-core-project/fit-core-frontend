import { RoutineDraft } from "@/types/routine"
import { WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"
import { UserResponse } from "@/types/project"

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(`[Runtime Guard] ${message}`)
}

export function guardGenerateResponse(data: unknown): asserts data is RoutineDraft {
    assert(typeof data === "object" && data !== null, "Generate response is null or not an object")

    const d = data as Record<string, unknown>

    assert(
        typeof d.routineDraftId === "string" && d.routineDraftId.length > 0,
        `Missing or empty routineDraftId — got: ${JSON.stringify(d.routineDraftId)}`
    )
    assert(
        Array.isArray(d.routineBlocks),
        `routineBlocks is not an array — got: ${typeof d.routineBlocks}`
    )
    assert(
        (d.routineBlocks as unknown[]).length > 0,
        "routineBlocks array is empty"
    )
}

export function guardFinalizeResponse(finalId: string | null): asserts finalId is string {
    assert(
        typeof finalId === "string" && finalId.length > 0,
        `Missing routineFinalId from finalize response — got: ${JSON.stringify(finalId)}`
    )
}

export function guardWorkoutSaveRequest(request: WorkoutSaveRequest): void {
    assert(
        Array.isArray(request.sets) && request.sets.length > 0,
        `sets is missing or empty before workout save — got: ${JSON.stringify(request.sets)}`
    )
}

export function guardProfileResponse(data: unknown): asserts data is UserResponse {
    assert(typeof data === "object" && data !== null, "Profile response is null or not an object")

    const d = data as Record<string, unknown>

    assert(
        typeof d.userId === "string" && d.userId.length > 0,
        `Missing or empty userId in profile response — got: ${JSON.stringify(d.userId)}`
    )
    assert(
        typeof d.email === "string" && d.email.length > 0,
        `Missing or empty email in profile response — got: ${JSON.stringify(d.email)}`
    )
}
