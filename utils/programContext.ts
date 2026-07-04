import type { ProgramPlayerContext } from "@/types/program"

export const PROGRAM_CONTEXT_STORAGE_KEY = "fitcore_program_context"

type ProgramContextStorage = Pick<Storage, "getItem" | "removeItem">
type ProgramContextWriteStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">

function resolveStorage(storage?: ProgramContextStorage): ProgramContextStorage | null {
    if (storage) return storage
    if (typeof window === "undefined") return null
    return window.localStorage
}

function resolveWriteStorage(storage?: ProgramContextWriteStorage): ProgramContextWriteStorage | null {
    if (storage) return storage
    if (typeof window === "undefined") return null
    return window.localStorage
}

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

export function setProgramContext(
    context: ProgramPlayerContext,
    storage?: ProgramContextWriteStorage
): void {
    resolveWriteStorage(storage)?.setItem(PROGRAM_CONTEXT_STORAGE_KEY, JSON.stringify(context))
}

export function clearProgramContext(storage?: ProgramContextStorage): void {
    resolveStorage(storage)?.removeItem(PROGRAM_CONTEXT_STORAGE_KEY)
}

/** Clears program context only if its programId matches the given id. No-op if no context. */
export function clearProgramContextIfProgram(
    programId: string,
    storage?: ProgramContextStorage
): void {
    const resolvedStorage = resolveStorage(storage)
    if (!resolvedStorage) return
    const context = parseProgramPlayerContext(resolvedStorage.getItem(PROGRAM_CONTEXT_STORAGE_KEY))
    if (!context || context.programId !== programId) return
    resolvedStorage.removeItem(PROGRAM_CONTEXT_STORAGE_KEY)
}

export function readProgramContext(storage?: ProgramContextStorage): ProgramPlayerContext | null {
    const resolvedStorage = resolveStorage(storage)
    if (!resolvedStorage) return null
    return parseProgramPlayerContext(resolvedStorage.getItem(PROGRAM_CONTEXT_STORAGE_KEY))
}

export function readValidProgramContext(
    expectedRoutineFinalId: string | null | undefined,
    storage?: ProgramContextStorage
): ProgramPlayerContext | null {
    const resolvedStorage = resolveStorage(storage)
    if (!resolvedStorage) return null

    const raw = resolvedStorage.getItem(PROGRAM_CONTEXT_STORAGE_KEY)
    const context = parseProgramPlayerContext(raw)
    if (!context) {
        if (raw) resolvedStorage.removeItem(PROGRAM_CONTEXT_STORAGE_KEY)
        return null
    }
    if (!expectedRoutineFinalId || context.routineFinalId !== expectedRoutineFinalId) {
        resolvedStorage.removeItem(PROGRAM_CONTEXT_STORAGE_KEY)
        return null
    }
    return context
}
