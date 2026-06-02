import { RoutineGenerateRequest } from "@/utils/requestAssembler"
import { RoutineDraft } from "@/types/routine"
import routineApiClient from "@/lib/api/routine/routineApiClient"

export async function generateRoutine(requestPayload: RoutineGenerateRequest): Promise<RoutineDraft> {
    return routineApiClient.generate(requestPayload)
}
