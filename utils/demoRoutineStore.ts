/**
 * Demo-mode (테스트 모드) stand-in for the saved-routine endpoints (/api/routines/finals, finalize, manual
 * drafts). Everything lives in localStorage under DEMO_ROUTINE_FINALS_STORAGE_KEY, so a demo visitor never
 * reads or writes the shared demo account on the backend. Only routine generation still calls the backend.
 */
import type { Page } from "@/types/project"
import type { RoutineBlock, RoutineDraft, RoutineFinalResponse } from "@/types/routine"
import type { FinalizePayload } from "@/lib/api/routine/routineApiClient"
import {
    DEMO_ROUTINE_FINALS_STORAGE_KEY,
    demoRoutineFinals,
    ensureDemoSeed,
    readJson,
    toDemoPage,
    writeJson,
} from "@/utils/demoMode"
import { DEMO_USER_ID } from "@/utils/demoSeed"
import { demoHttpError } from "@/utils/demoHttpError"

const ACTIVE_ROUTINE_KEY = "fitcore_active_routine"
const SPLIT_LABEL_KEY = "fitcore_split_label"
const MANUAL_DRAFT_PREFIX = "demo-draft-manual"

/** Unique enough for one browser; prefixed so it never collides with a seeded `demo-final-<date>` id. */
export function demoLocalId(prefix: string): string {
    const random =
        typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10)
    return `${prefix}-${Date.now().toString(36)}-${random}`
}

/** Current KST wall-clock time as a zone-less LocalDateTime string (the backend's savedAt shape). */
const kstNowLocal = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19)

/** Newest first, as GET /api/routines/finals sorts (savedAt DESC); ties go to the later workout date. */
function sortNewestFirst(finals: RoutineFinalResponse[]): RoutineFinalResponse[] {
    return [...finals].sort(
        (a, b) => b.savedAt.localeCompare(a.savedAt) || b.targetWorkoutDate.localeCompare(a.targetWorkoutDate),
    )
}

export function readDemoFinals(): RoutineFinalResponse[] {
    ensureDemoSeed()
    return sortNewestFirst(readJson<RoutineFinalResponse[]>(DEMO_ROUTINE_FINALS_STORAGE_KEY, demoRoutineFinals))
}

export function getDemoFinalsPage(page: number, size: number): Page<RoutineFinalResponse> {
    return toDemoPage(readDemoFinals(), page, size)
}

export function findDemoFinal(routineFinalId: string): RoutineFinalResponse | null {
    return readDemoFinals().find((final) => final.routineFinalId === routineFinalId) ?? null
}

/** Rejects like the backend's 404 (ROUTINE_NOT_FOUND) for an id this demo browser does not hold. */
export function getDemoFinal(routineFinalId: string): RoutineFinalResponse {
    const final = findDemoFinal(routineFinalId)
    if (!final) throw demoHttpError(404, "R001", "해당 루틴를 찾을 수 없습니다.")
    return final
}

/** Rough minutes for a routine with no estimate (a manual draft): ~40 s per set plus its rest. */
export function estimateRoutineMinutes(blocks: RoutineBlock[]): number {
    const seconds = blocks.reduce(
        (sum, block) =>
            sum + block.prescription.reduce((s, set) => s + 40 + (set.targetRestSec ?? block.defaultRestSec ?? 90), 0),
        0,
    )
    if (seconds <= 0) return 0
    return Math.max(5, Math.round(seconds / 60 / 5) * 5)
}

function readActiveRoutine(): RoutineDraft | null {
    try {
        const raw = localStorage.getItem(ACTIVE_ROUTINE_KEY)
        return raw ? (JSON.parse(raw) as RoutineDraft) : null
    } catch {
        return null
    }
}

/**
 * Demo counterpart of POST /api/routines/drafts/{draftId}/finalize. The draft can be one the backend
 * generated, the seeded routine or a demo manual draft; its metadata (title, estimate, status, rationale,
 * warnings) comes from the stored active routine when the ids match, which the draft page writes right
 * before finalizing. The split comes from fitcore_split_label like the backend's draft targetSplitLabel,
 * else "custom".
 */
export function finalizeDemoRoutine(
    draftId: string,
    payload: FinalizePayload,
): { routineFinalId: string; targetSplitLabel: string } {
    const active = readActiveRoutine()
    const draft = active?.routineDraftId === draftId ? active : null
    // A manual draft never has a split (the backend gives it null → "custom"), even if a stale label lingers.
    const isManual = draftId.startsWith(MANUAL_DRAFT_PREFIX)
    const storedSplit = draft && !isManual ? localStorage.getItem(SPLIT_LABEL_KEY)?.trim() : null
    const targetSplitLabel = storedSplit || "custom"

    const routineBlocks = (payload.finalRoutinePayload.routineBlocks ?? []).map((block) => {
        const publicBlock = { ...block, prescription: block.prescription.map((set) => ({ ...set })) }
        delete publicBlock.clientBlockId
        return publicBlock
    })
    const estimate = draft?.totalEstimatedTime && draft.totalEstimatedTime > 0 ? draft.totalEstimatedTime : 0

    const final: RoutineFinalResponse = {
        routineFinalId: demoLocalId("demo-final-local"),
        routineDraftId: draftId,
        userId: DEMO_USER_ID,
        targetWorkoutDate: payload.targetWorkoutDate,
        targetSplitLabel,
        finalRoutinePayload: {
            fallback: draft?.isFallback ?? false,
            generationStatus: draft?.generationStatus ?? "success",
            statusReasonCode: draft?.statusReasonCode ?? "none",
            rationaleSummary: draft?.rationaleSummary ?? [],
            routineBlocks,
            summaryTitle: draft?.summaryTitle?.trim() || "새 루틴",
            totalEstimatedTime: estimate || estimateRoutineMinutes(routineBlocks),
            warnings: draft?.warnings ?? [],
        },
        acceptedWithoutEdits: payload.acceptedWithoutEdits,
        userEditSummary: payload.userEditSummary ?? [],
        savedAt: kstNowLocal(),
    }

    writeJson(DEMO_ROUTINE_FINALS_STORAGE_KEY, [final, ...readDemoFinals()])
    return { routineFinalId: final.routineFinalId, targetSplitLabel }
}

/** Demo counterpart of POST /api/routines/drafts/manual: an empty draft with a local id. */
export function createDemoManualDraft(title?: string): RoutineDraft {
    return {
        routineDraftId: demoLocalId(MANUAL_DRAFT_PREFIX),
        generationStatus: "success",
        statusReasonCode: "none",
        isFallback: false,
        totalEstimatedTime: 0,
        summaryTitle: title?.trim() ? title : "새 루틴",
        rationaleSummary: [],
        warnings: [],
        routineBlocks: [],
    }
}
