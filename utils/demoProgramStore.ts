/**
 * Demo-mode (테스트 모드) stand-in for /api/programs, kept in localStorage under DEMO_PROGRAMS_STORAGE_KEY.
 * Mirrors fit-core-backend RoutineProgramService: create validation, the single ACTIVE program rule,
 * archive / activate / permanent delete rules, currentPosition / nextItem / item state, and the
 * completion step a workout save runs (completeCurrentItemAfterWorkout).
 */
import type {
    ProgramCreateRequest,
    ProgramDetailResponse,
    ProgramItemResponse,
    ProgramItemState,
    ProgramStatus,
    ProgramSummaryResponse,
    ProgramUpdateRequest,
} from "@/types/program"
import type { RoutineFinalResponse } from "@/types/routine"
import { DEMO_PROGRAMS_STORAGE_KEY, ensureDemoSeed, readJson, writeJson } from "@/utils/demoMode"
import { demoLocalId, readDemoFinals } from "@/utils/demoRoutineStore"
import { demoHttpError } from "@/utils/demoHttpError"

interface DemoProgramItem {
    programItemId: string
    position: number
    routineFinalId: string
    /** Title snapshot taken at create time, as the backend stores titleSnapshot. */
    titleSnapshot: string
}

interface DemoCompletionEvent {
    programItemId: string
    workoutSessionId: string
    completedPosition: number
}

export interface DemoProgramRecord {
    programId: string
    name: string
    status: ProgramStatus
    currentPosition: number
    createdAt: string
    completedAt: string | null
    items: DemoProgramItem[]
    events: DemoCompletionEvent[]
}

const badRequest = (message: string) => demoHttpError(400, "PROGRAM_BAD_REQUEST", message)
const conflict = (message: string) => demoHttpError(409, "PROGRAM_CONFLICT", message)
const notFound = () => demoHttpError(404, "PROGRAM_NOT_FOUND", "Program not found.")

const isBlank = (value: string | null | undefined) => value == null || value.trim() === ""
const kstNowLocal = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19)

function readPrograms(): DemoProgramRecord[] {
    ensureDemoSeed()
    return readJson<DemoProgramRecord[]>(DEMO_PROGRAMS_STORAGE_KEY, [])
}

function writePrograms(programs: DemoProgramRecord[]): void {
    writeJson(DEMO_PROGRAMS_STORAGE_KEY, programs)
}

function finalsById(): Map<string, RoutineFinalResponse> {
    return new Map(readDemoFinals().map((final) => [final.routineFinalId, final]))
}

function resolveFinalTitle(final: RoutineFinalResponse | undefined): string {
    const title = final?.finalRoutinePayload?.summaryTitle
    if (!isBlank(title)) return title!
    if (!isBlank(final?.targetSplitLabel)) return final!.targetSplitLabel
    return "Saved Routine"
}

function toItemResponse(
    item: DemoProgramItem,
    state: ProgramItemState,
    finals: Map<string, RoutineFinalResponse>,
): ProgramItemResponse {
    const final = finals.get(item.routineFinalId)
    const total = final?.finalRoutinePayload?.totalEstimatedTime ?? 0
    return {
        programItemId: item.programItemId,
        position: item.position,
        routineFinalId: item.routineFinalId,
        title: isBlank(item.titleSnapshot) ? resolveFinalTitle(final) : item.titleSnapshot,
        targetSplitLabel: final?.targetSplitLabel ?? null,
        estimatedTime: total > 0 ? total : null,
        state,
    }
}

function resolveNextItem(program: DemoProgramRecord, finals: Map<string, RoutineFinalResponse>): ProgramItemResponse | null {
    if (program.status !== "ACTIVE") return null
    const item = program.items.find((i) => i.position === program.currentPosition)
    return item ? toItemResponse(item, "CURRENT", finals) : null
}

function resolveState(program: DemoProgramRecord, item: DemoProgramItem, doneItemIds: Set<string>): ProgramItemState {
    if (program.status === "COMPLETED" || doneItemIds.has(item.programItemId)) return "DONE"
    if (item.position < program.currentPosition) return "DONE"
    if (program.status === "ACTIVE" && item.position === program.currentPosition) return "CURRENT"
    return "UPCOMING"
}

const sortedItems = (program: DemoProgramRecord) => [...program.items].sort((a, b) => a.position - b.position)

function toSummary(program: DemoProgramRecord, finals = finalsById()): ProgramSummaryResponse {
    return {
        programId: program.programId,
        name: program.name,
        status: program.status,
        currentPosition: program.currentPosition,
        totalItems: program.items.length,
        completedAt: program.completedAt,
        nextItem: resolveNextItem(program, finals),
    }
}

function toDetail(program: DemoProgramRecord, finals = finalsById()): ProgramDetailResponse {
    const doneItemIds = new Set(program.events.map((event) => event.programItemId))
    return {
        ...toSummary(program, finals),
        items: sortedItems(program).map((item) => toItemResponse(item, resolveState(program, item, doneItemIds), finals)),
    }
}

function getOwned(programs: DemoProgramRecord[], programId: string): DemoProgramRecord {
    const program = programs.find((p) => p.programId === programId)
    if (!program) throw notFound()
    return program
}

const hasActive = (programs: DemoProgramRecord[]) => programs.some((p) => p.status === "ACTIVE")

export function createDemoProgram(request: ProgramCreateRequest): ProgramDetailResponse {
    // @NotBlank name, @Size(2..20) routineFinalIds (bean validation), then the service checks
    if (isBlank(request?.name)) throw badRequest("Program name must not be blank.")
    const ids = request.routineFinalIds
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 20) {
        throw badRequest("routineFinalIds must contain 2 to 20 items.")
    }
    if (ids.some((id) => isBlank(id))) throw badRequest("routineFinalIds must not contain blank ids.")
    if (new Set(ids).size !== ids.length) throw badRequest("Duplicate routineFinalIds are not allowed.")

    const programs = readPrograms()
    if (hasActive(programs)) throw conflict("Active program already exists.")
    const finals = finalsById()
    if (ids.some((id) => !finals.has(id))) throw demoHttpError(404, "R001", "해당 루틴를 찾을 수 없습니다.")

    const programId = demoLocalId("demo-program")
    const program: DemoProgramRecord = {
        programId,
        name: request.name.trim(),
        status: "ACTIVE",
        currentPosition: 1,
        createdAt: kstNowLocal(),
        completedAt: null,
        items: ids.map((routineFinalId, i) => ({
            programItemId: `${programId}-item-${i + 1}`,
            position: i + 1,
            routineFinalId,
            titleSnapshot: resolveFinalTitle(finals.get(routineFinalId)),
        })),
        events: [],
    }
    writePrograms([program, ...programs])
    return toDetail(program, finals)
}

export function getDemoActiveProgram(): ProgramSummaryResponse | null {
    const active = readPrograms().find((p) => p.status === "ACTIVE")
    return active ? toSummary(active) : null
}

export function getDemoProgram(programId: string): ProgramDetailResponse {
    return toDetail(getOwned(readPrograms(), programId))
}

/** Newest first, as findByUserIdOrderByCreatedAtDesc. */
export function getDemoPrograms(): ProgramSummaryResponse[] {
    const finals = finalsById()
    return [...readPrograms()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((program) => toSummary(program, finals))
}

/** Applies `change` to one stored program and returns its detail response. */
function mutate(programId: string, change: (program: DemoProgramRecord, programs: DemoProgramRecord[]) => void): ProgramDetailResponse {
    const programs = readPrograms()
    const program = getOwned(programs, programId)
    change(program, programs)
    writePrograms(programs)
    return toDetail(program)
}

export function updateDemoProgram(programId: string, request: ProgramUpdateRequest): ProgramDetailResponse {
    if (isBlank(request?.name)) throw badRequest("Program name must not be blank.")
    return mutate(programId, (program) => {
        program.name = request.name.trim()
    })
}

/** Idempotent: an archived program comes back unchanged. Any other status may be archived. */
export function archiveDemoProgram(programId: string): ProgramDetailResponse {
    return mutate(programId, (program) => {
        program.status = "ARCHIVED"
    })
}

/** Only an archived program, and only while no other program is ACTIVE. Position is kept. */
export function activateDemoProgram(programId: string): ProgramDetailResponse {
    return mutate(programId, (program, programs) => {
        if (program.status !== "ARCHIVED") throw conflict("Only archived programs can be activated.")
        if (hasActive(programs)) throw conflict("Active program already exists.")
        program.status = "ACTIVE"
    })
}

/** Only an archived program; its items and completion events go with it. */
export function deleteDemoProgramPermanently(programId: string): void {
    const programs = readPrograms()
    const program = getOwned(programs, programId)
    if (program.status !== "ARCHIVED") throw conflict("Only archived programs can be permanently deleted.")
    writePrograms(programs.filter((p) => p.programId !== programId))
}

/**
 * The program step of a workout save (backend completeCurrentItemAfterWorkout), split in two because the
 * backend runs it in the save's transaction: `prepare` validates in the backend's order and throws the
 * same 400 / 409 / 404 before anything is written; the returned `commit` records the completion and
 * advances (or completes) the program once the session is stored. Returns null when the save carries no
 * program link.
 */
export function prepareDemoProgramCompletion(
    programId: string | null | undefined,
    programItemId: string | null | undefined,
    sourceRoutineFinalId: string | null | undefined,
): ((workoutSessionId: string) => void) | null {
    if (programId == null && programItemId == null) return null
    if (isBlank(programId) || isBlank(programItemId)) {
        throw badRequest("programId and programItemId must be provided together.")
    }
    const programs = readPrograms()
    const program = getOwned(programs, programId!)
    if (program.status !== "ACTIVE") throw conflict("Only active programs can advance.")
    const currentItem = program.items.find((item) => item.position === program.currentPosition)
    if (!currentItem) throw conflict("Current program item does not exist.")
    if (currentItem.programItemId !== programItemId) throw conflict("Requested program item is not current.")
    if (isBlank(sourceRoutineFinalId)) throw badRequest("sourceRoutineFinalId is required for program workout saves.")
    if (currentItem.routineFinalId !== sourceRoutineFinalId) {
        throw conflict("Workout routine does not match current program item.")
    }

    return (workoutSessionId: string) => {
        const latest = readPrograms()
        const target = latest.find((p) => p.programId === program.programId)
        if (!target || target.events.some((event) => event.workoutSessionId === workoutSessionId)) return
        target.events.push({
            programItemId: currentItem.programItemId,
            workoutSessionId,
            completedPosition: currentItem.position,
        })
        if (target.currentPosition < target.items.length) {
            target.currentPosition += 1
        } else {
            target.status = "COMPLETED"
            target.completedAt = kstNowLocal()
        }
        writePrograms(latest)
    }
}
