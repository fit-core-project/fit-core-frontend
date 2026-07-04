import type { ProgramPlayerContext } from "@/types/program"

export const PROGRAM_CONTEXT_STORAGE_KEY = "fitcore_program_context"

export function parseProgramPlayerContext(raw: string | null): ProgramPlayerContext | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as Partial<ProgramPlayerContext>
        if (
            typeof parsed.programId === "string" &&
            parsed.programId.length > 0 &&
            typeof parsed.programItemId === "string" &&
            parsed.programItemId.length > 0 &&
            typeof parsed.routineFinalId === "string" &&
            parsed.routineFinalId.length > 0
        ) {
            return {
                programId: parsed.programId,
                programItemId: parsed.programItemId,
                routineFinalId: parsed.routineFinalId,
            }
        }
        return null
    } catch {
        return null
    }
}

export function buildProgramPlayerContext(
    programId: string,
    programItemId: string,
    routineFinalId: string
): ProgramPlayerContext {
    return { programId, programItemId, routineFinalId }
}
