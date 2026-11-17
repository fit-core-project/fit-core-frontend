"use client"

import { useEffect, useState, useMemo, useRef, useCallback, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, Clock, GripVertical, Minus, Plus, Repeat, Save, Search, Trash2 } from "lucide-react"
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { RoutineDraft, RoutineBlock, SetPrescription } from "@/types/routine"
import { useSettingsStore } from "@/store/settingsStore"
import { getExerciseCatalog, getRecentRecord } from "@/services/exerciseService"
import { ExerciseCatalogItem } from "@/services/mockDataFactory"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { generateEditSummary } from "@/utils/routineDiff"
import { getKstToday } from "@/utils/date"
import { FinalizeState } from "@/types/state"
import { NUMERIC_RANGES, toDisplayBound } from "@/utils/numericValidation"
import { equipmentLabel, fallbackReasonLabel, muscleLabel, routineOriginLabel } from "@/utils/displayLabels"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import { Button, ButtonLink, cx, EmptyState, LineBadge, Notice, RouteStrip, Sheet, Skeleton, StationRow, Tag } from "@/components/ui"
import { DRAFT_INVALID_MESSAGE, DRAFT_WEIGHT_MAX_KG, draftInvalidReason, formatWeight, kgToDisplay, parseSetInput, type SetField, type WeightUnit } from "./draftEditing"

// Korean search words → SSOT muscle slugs, matched with includes() against the catalog primaryMuscle.
const MUSCLE_KR: Record<string, string[]> = {
    "가슴": ["chest"],
    "흉근": ["chest"],
    "상부 가슴": ["chest"],
    "하부 가슴": ["chest"],

    "등": ["upper-back", "lower-back"],
    "광배": ["upper-back"],
    "광배근": ["upper-back"],
    "상부 등": ["upper-back"],
    "하부 등": ["lower-back"],
    "허리": ["lower-back"],

    "어깨": ["deltoids"],
    "삼각근": ["deltoids"],
    "전면 어깨": ["front-deltoids"],
    "전면어깨": ["front-deltoids"],
    "앞 어깨": ["front-deltoids"],
    "측면 어깨": ["side-deltoids"],
    "측면어깨": ["side-deltoids"],
    "옆 어깨": ["side-deltoids"],
    "후면 어깨": ["back-deltoids"],
    "후면어깨": ["back-deltoids"],
    "뒤 어깨": ["back-deltoids"],

    "이두": ["biceps"],
    "이두근": ["biceps"],
    "삼두": ["triceps"],
    "삼두근": ["triceps"],
    "전완": ["forearm"],
    "전완근": ["forearm"],

    "하체": ["quadriceps", "hamstring", "gluteal", "calves", "adductor", "abductors"],
    "다리": ["quadriceps", "hamstring", "gluteal", "calves", "adductor", "abductors"],
    "허벅지": ["quadriceps", "hamstring"],
    "앞 허벅지": ["quadriceps"],
    "뒤 허벅지": ["hamstring"],
    "대퇴사두": ["quadriceps"],
    "햄스트링": ["hamstring"],
    "엉덩이": ["gluteal"],
    "둔근": ["gluteal"],
    "힙": ["gluteal"],
    "종아리": ["calves"],
    "내전근": ["adductor"],
    "외전근": ["abductors"],

    "복근": ["abs", "obliques"],
    "복부": ["abs", "obliques"],
    "코어": ["abs", "obliques", "lower-back"],
    "옆구리": ["obliques"],

    "승모근": ["trapezius"],
    "승모": ["trapezius"],
}

// Fetch recent record for exerciseId and apply default weight/reps to all sets.
async function applyRecentRecordDefaults(block: RoutineBlock, exerciseId: string): Promise<RoutineBlock> {
    const record = await getRecentRecord(exerciseId)
    if (!record) return block
    const weight = record.defaultWeight > 0 ? record.defaultWeight : null
    return {
        ...block,
        prescription: block.prescription.map((s) => ({
            ...s,
            targetWeightKg: weight,
            targetReps: record.defaultReps,
        })),
    }
}


export default function RoutineReviewPage() {
    const router = useRouter()
    const [draft, setDraft] = useState<RoutineDraft | null>(null)
    const [finalizeStatus, setFinalizeStatus] = useState<FinalizeState>("loading")
    const { weightUnit } = useSettingsStore()
    const [displayUnit, setDisplayUnit] = useState<"kg" | "lbs">(weightUnit)
    const initialDraftRef = useRef<RoutineDraft | null>(null)
    const postSaveNavigationRef = useRef(false)
    const [isManualMode, setIsManualMode] = useState(false)

    useEffect(() => {
        setIsManualMode(new URLSearchParams(window.location.search).get("mode") === "manual")
    }, [])

    // DnD sensors
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    // Exercise swap state
    const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([])
    const [swapBlockId, setSwapBlockId] = useState<string | null>(null)
    const [swapQuery, setSwapQuery] = useState("")
    const [swapLoading, setSwapLoading] = useState(false)
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
    const [backConfirmOpen, setBackConfirmOpen] = useState(false)
    const [pendingDeleteBlockId, setPendingDeleteBlockId] = useState<string | null>(null)
    const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "failed">("loading")
    const [toastMessage, setToastMessage] = useState("")

    const line = useMemo(() => lineForRoutine(null, draft?.routineBlocks.flatMap((block) => block.primaryMuscles ?? []) ?? []), [draft])

    // 1. Load the stored routine first; the catalog loads on its own so a catalog failure never hides the routine.
    useEffect(() => {
        try {
            const saved = localStorage.getItem("fitcore_active_routine")
            if (saved) {
                const data = JSON.parse(saved) as RoutineDraft
                const hydratedDraft: RoutineDraft = {
                    ...data,
                    routineBlocks: (data.routineBlocks ?? []).map((block, index) => ({
                        ...block,
                        clientBlockId: block.clientBlockId ?? `cbid_${Date.now()}_${index}`,
                    })),
                }
                initialDraftRef.current = JSON.parse(JSON.stringify(hydratedDraft))
                setDraft(hydratedDraft)
            }
        } catch (err) {
            console.error("루틴 초기화 오류:", err)
        } finally {
            setFinalizeStatus("idle")
        }
    }, [])

    const loadCatalog = useCallback(async () => {
        setCatalogStatus("loading")
        try {
            const catalogData = await getExerciseCatalog()
            setCatalog(Array.isArray(catalogData) ? catalogData : [])
            setCatalogStatus("ready")
        } catch (err) {
            console.error("[draft] exercise catalog failed:", err)
            setCatalogStatus("failed")
        }
    }, [])

    useEffect(() => {
        void loadCatalog()
    }, [loadCatalog])

    useEffect(() => {
        if (!toastMessage) return
        const timer = window.setTimeout(() => setToastMessage(""), 3000)
        return () => window.clearTimeout(timer)
    }, [toastMessage])

    // Set / Block mutations

    const updateSet = (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => {
        if (!draft) return
        setDraft({
            ...draft,
            routineBlocks: draft.routineBlocks.map((block) =>
                block.clientBlockId !== blockId
                    ? block
                    : {
                          ...block,
                          prescription: block.prescription.map((set, i) =>
                              i === arrayIndex ? { ...set, [field]: value } : set
                          ),
                      }
            ),
        })
    }

    const addSet = (blockId: string) => {
        if (!draft) return
        setDraft({
            ...draft,
            routineBlocks: draft.routineBlocks.map((block) => {
                if (block.clientBlockId !== blockId) return block
                const last = block.prescription[block.prescription.length - 1]
                const newSet: SetPrescription = last
                    ? { ...last, setIndex: block.prescription.length }
                    : {
                          setIndex: block.prescription.length,
                          setType: "working",
                          targetReps: 10,
                          targetWeightKg: null,
                          targetRir: 2,
                          targetRestSec: 60,
                      }
                const updated = [...block.prescription, newSet]
                return { ...block, prescription: updated.map((s, i) => ({ ...s, setIndex: i + 1 })) }
            }),
        })
    }

    const deleteSet = (blockId: string, arrayIndex: number) => {
        if (!draft) return
        setDraft({
            ...draft,
            routineBlocks: draft.routineBlocks.map((block) => {
                if (block.clientBlockId !== blockId) return block
                const updated = block.prescription.filter((_, i) => i !== arrayIndex)
                return { ...block, prescription: updated.map((s, i) => ({ ...s, setIndex: i + 1 })) }
            }),
        })
    }

    const reorderBlocks = (activeId: string, overId: string) => {
        setDraft((prev) => {
            if (!prev) return prev
            const oldIndex = prev.routineBlocks.findIndex((b) => b.clientBlockId === activeId)
            const newIndex = prev.routineBlocks.findIndex((b) => b.clientBlockId === overId)
            const reordered = arrayMove(prev.routineBlocks, oldIndex, newIndex)
            return { ...prev, routineBlocks: reordered.map((b, i) => ({ ...b, order: i + 1 })) }
        })
    }

    const requestDeleteBlock = (blockId: string) => setPendingDeleteBlockId(blockId)

    const confirmDeleteBlock = () => {
        const blockId = pendingDeleteBlockId
        setPendingDeleteBlockId(null)
        if (!blockId) return
        setDraft((prev) =>
            prev ? { ...prev, routineBlocks: prev.routineBlocks.filter((b) => b.clientBlockId !== blockId) } : prev
        )
        setEditingBlockId((prev) => (prev === blockId ? null : prev))
    }

    const updateRestTime = (blockId: string, arrayIndex: number, value: number) => {
        updateSet(blockId, arrayIndex, "targetRestSec", value)
    }

    // Closing the picker drops a newly added block that never got an exercise.
    const handleCloseSwapModal = () => {
        const blockId = swapBlockId
        if (blockId) {
            setDraft((prev) => {
                if (!prev) return prev
                const block = prev.routineBlocks.find((b) => b.clientBlockId === blockId)
                if (!block || block.exerciseId) return prev
                return { ...prev, routineBlocks: prev.routineBlocks.filter((b) => b.clientBlockId !== blockId) }
            })
        }
        setSwapBlockId(null)
        setSwapQuery("")
    }

    const catalogReady = catalogStatus === "ready"

    const addNewExerciseBlock = () => {
        if (!draft || !catalogReady) return
        const clientBlockId = `cbid_${Date.now()}`
        const newBlock: RoutineBlock = {
            order: draft.routineBlocks.length + 1,
            clientBlockId,
            exerciseId: "",
            exerciseName: "",
            exerciseRationale: "",
            prescription: [{ setIndex: 1, setType: "working", targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 }],
        }
        setDraft({ ...draft, routineBlocks: [...draft.routineBlocks, newBlock] })
        setSwapBlockId(clientBlockId)
        setSwapQuery("")
    }

    // 3. Exercise replacement with recent-record auto-fill (all sets)
    const replaceExercise = async (blockId: string, item: ExerciseCatalogItem) => {
        if (!draft) return
        setSwapLoading(true)
        try {
            const currentBlock = draft.routineBlocks.find((b) => b.clientBlockId === blockId)
            if (!currentBlock) return

            const baseBlock: RoutineBlock = {
                ...currentBlock,
                exerciseId: item.id,
                exerciseName: item.nameKr,
                exerciseRationale: `${muscleLabel(item.primaryMuscle)} 주동근 운동 (${equipmentLabel(item.equipment)})`,
            }
            let enrichedBlock: RoutineBlock
            try {
                enrichedBlock = await applyRecentRecordDefaults(baseBlock, item.id)
            } catch (err) {
                // Keep the previous exercise; a newly added empty block is removed by the close path.
                console.error("[draft] recent record failed:", err)
                handleCloseSwapModal()
                setToastMessage("최근 기록을 불러오지 못해 운동을 바꾸지 못했어요. 다시 시도하세요.")
                return
            }

            setDraft((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    routineBlocks: prev.routineBlocks.map((b) => (b.clientBlockId !== blockId ? b : enrichedBlock)),
                }
            })
            setSwapBlockId(null)
            setSwapQuery("")
        } finally {
            setSwapLoading(false)
        }
    }

    // Derived state

    const totalTime = useMemo(() => {
        if (!draft || !initialDraftRef.current) return 0
        const isModified = JSON.stringify(draft.routineBlocks) !== JSON.stringify(initialDraftRef.current.routineBlocks)
        if (!isModified) return initialDraftRef.current.totalEstimatedTime
        const warmupSec = 5 * 60
        const transitionSec = Math.max(0, draft.routineBlocks.length - 1) * 120
        const workAndRestSec = draft.routineBlocks.reduce((acc, block) => {
            const sets = block.prescription.length
            const workSec = sets * 60
            const restSec = block.prescription.reduce(
                (sum, set, index) => (index < sets - 1 ? sum + set.targetRestSec : sum),
                0
            )
            return acc + workSec + restSec
        }, 0)
        return Math.ceil((warmupSec + transitionSec + workAndRestSec) / 60)
    }, [draft])

    // Validation: gate finalize on zero exercises, an unpicked exercise, or any set out of bounds (every mode).
    const invalidReason = useMemo(() => (draft ? draftInvalidReason(draft.routineBlocks) : "noExercises"), [draft])
    const isRoutineValid = invalidReason === null

    const swapBlock = useMemo(
        () => (swapBlockId && draft ? (draft.routineBlocks.find((b) => b.clientBlockId === swapBlockId) ?? null) : null),
        [swapBlockId, draft]
    )

    const aiCandidates = useMemo(() => {
        if (!swapBlock?.substitutionCandidates?.length) return []
        const candidateIds = new Set(swapBlock.substitutionCandidates.map((c) => c.exerciseId))
        return (Array.isArray(catalog) ? catalog : []).filter((item) => candidateIds.has(item.id))
    }, [swapBlock, catalog])

    const filteredCatalog = useMemo(() => {
        const q = swapQuery
        const qLower = q.toLowerCase()
        const enList = MUSCLE_KR[q.trim()] ?? null
        const muscle = (item: { primaryMuscle: string }) => item.primaryMuscle.toLowerCase()
        return (Array.isArray(catalog) ? catalog : []).filter(
            (item) =>
                item.nameKr?.includes(q) ||
                item.nameEn?.toLowerCase().includes(qLower) ||
                muscle(item).includes(qLower) ||
                (enList !== null && enList.some((en) => muscle(item).includes(en)))
        )
    }, [catalog, swapQuery])

    const goHomeAfterSave = useCallback(() => {
        if (postSaveNavigationRef.current) return
        postSaveNavigationRef.current = true
        router.push("/")
    }, [router])

    const startSavedRoutine = useCallback(() => {
        if (postSaveNavigationRef.current) return
        postSaveNavigationRef.current = true
        router.push("/ai_routine/player")
    }, [router])

    useEffect(() => {
        if (finalizeStatus !== "finalized") return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") goHomeAfterSave()
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [finalizeStatus, goHomeAfterSave])

    // 4. Save draft → call finalize API; post-save navigation is chosen in the completion modal.
    const handleFinalize = async () => {
        if (!draft || finalizeStatus === "loading" || finalizeStatus === "finalized") return
        postSaveNavigationRef.current = false
        setFinalizeStatus("loading")

        localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))

        const userEditSummary = generateEditSummary(
            initialDraftRef.current?.routineBlocks ?? [],
            draft.routineBlocks
        )
        const acceptedWithoutEdits = userEditSummary.length === 0

        const cleanRoutineBlocks = draft.routineBlocks.map((block) => {
            const publicBlock = { ...block }
            delete publicBlock.clientBlockId
            return publicBlock
        })

        const payload = {
            targetWorkoutDate: getKstToday(),
            // clientBlockId is UI-only state for drag-and-drop, not part of the public finalize contract.
            finalRoutinePayload: { routineBlocks: cleanRoutineBlocks },
            acceptedWithoutEdits,
            userEditSummary,
        }

        try {
            const finalId = await routineApiClient.finalize(draft.routineDraftId, payload)
            if (finalId) localStorage.setItem("fitcore_routine_final_id", finalId)
            setFinalizeStatus("finalized")
        } catch (err) {
            console.error("[draft] finalize failed:", err)
            localStorage.removeItem("fitcore_routine_final_id")
            setFinalizeStatus("failed")
        }
    }

    const leaveEditing = () => router.push(isManualMode ? "/workout" : "/ai_routine/generator")

    if (finalizeStatus === "loading" && !draft) {
        return (
            <div className="flex flex-col gap-3 bg-ground p-4" aria-busy="true">
                <span className="sr-only">루틴을 불러오는 중…</span>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="mt-4 h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        )
    }
    if (!draft) {
        return (
            <EmptyState
                className="pt-16"
                title="확인할 루틴이 없어요"
                body="AI 루틴을 만들거나 직접 루틴을 구성해 보세요."
                action={
                    <ButtonLink href="/ai_routine" variant="primary">
                        루틴 만들기
                    </ButtonLink>
                }
            />
        )
    }

    const blocks = draft.routineBlocks
    const pendingDeleteBlock = pendingDeleteBlockId ? (blocks.find((b) => b.clientBlockId === pendingDeleteBlockId) ?? null) : null
    const originLabel = routineOriginLabel({ isManual: isManualMode, isFallback: draft.isFallback })
    const fallbackReason = draft.isFallback ? fallbackReasonLabel(draft.statusReasonCode) : null

    return (
        <div className="flex min-h-full w-full flex-col bg-ground">
            <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-hairline bg-ground px-2 py-1.5">
                <button
                    type="button"
                    onClick={() => setBackConfirmOpen(true)}
                    aria-label="뒤로"
                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                >
                    <ArrowLeft className="size-5" aria-hidden />
                </button>
                <span className="min-w-0 flex-1 truncate text-body font-bold text-ink">루틴 확인</span>
                <div role="group" aria-label="무게 단위" className="flex rounded-control bg-surface p-0.5">
                    {(["kg", "lbs"] as const).map((unit) => (
                        <button
                            key={unit}
                            type="button"
                            aria-pressed={displayUnit === unit}
                            onClick={() => setDisplayUnit(unit)}
                            className={cx(
                                "min-h-11 min-w-11 rounded-[4px] px-2 text-body-sm font-bold",
                                displayUnit === unit ? "bg-ground text-ink shadow-[0_0_0_1px_var(--color-hairline)]" : "text-ink-2",
                            )}
                        >
                            {unit}
                        </button>
                    ))}
                </div>
                <Tag className="ml-1 mr-1">
                    <Clock className="size-3.5" aria-hidden />
                    <span className="tabular-nums">{totalTime}분</span>
                </Tag>
            </header>

            <div role="alert" aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
                {toastMessage && (
                    <p className="max-w-[440px] rounded-control bg-ink px-4 py-3 text-body-sm font-medium text-white">{toastMessage}</p>
                )}
            </div>

            <div className="flex flex-col gap-5 px-4 pb-6 pt-5">
                <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <LineBadge line={line} />
                        <Tag>{originLabel}</Tag>
                    </div>
                    <h1 className="mt-2 text-title font-bold text-ink">{draft.summaryTitle || (isManualMode ? "내 루틴" : "오늘의 루틴")}</h1>
                </div>

                {draft.isFallback && (
                    <Notice title={fallbackReason ?? "기본 규칙으로 만든 루틴이에요"}>
                        AI 개인화 없이 만든 루틴이에요. 필요하면 운동을 바꿔서 쓰세요.
                    </Notice>
                )}

                {draft.warnings.length > 0 && (
                    <Notice tone="danger">
                        <ul className="flex flex-col gap-1">
                            {draft.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                            ))}
                        </ul>
                    </Notice>
                )}

                {catalogStatus === "failed" && (
                    <Notice tone="danger" title="운동 목록을 불러오지 못했어요">
                        <p>루틴은 그대로 편집하고 저장할 수 있지만, 지금은 운동 교체와 추가를 할 수 없어요.</p>
                        <button
                            type="button"
                            onClick={() => void loadCatalog()}
                            className="mt-1 inline-flex min-h-11 items-center font-bold underline underline-offset-2"
                        >
                            다시 불러오기
                        </button>
                    </Notice>
                )}

                {!isManualMode && draft.rationaleSummary.length > 0 && (
                    <ul className="flex flex-col gap-1.5 text-body-sm text-ink-2">
                        {draft.rationaleSummary.map((text, index) => (
                            <li key={index}>{text}</li>
                        ))}
                    </ul>
                )}

                <section aria-label="운동 순서" className="flex flex-col gap-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={({ active, over }: DragEndEvent) => {
                            if (over && active.id !== over.id) reorderBlocks(String(active.id), String(over.id))
                        }}
                    >
                        <SortableContext items={blocks.map((b) => b.clientBlockId!)} strategy={verticalListSortingStrategy}>
                            <ol aria-label="루틴 노선" className="flex flex-col">
                                {blocks.map((block, index) => (
                                    <SortableStation
                                        key={block.clientBlockId}
                                        block={block}
                                        line={line}
                                        isLast={index === blocks.length - 1}
                                        expanded={editingBlockId === block.clientBlockId}
                                        onToggle={() => setEditingBlockId((prev) => (prev === block.clientBlockId ? null : block.clientBlockId!))}
                                        displayUnit={displayUnit}
                                        onUpdateSet={updateSet}
                                        onUpdateRestTime={updateRestTime}
                                        onAddSet={addSet}
                                        onDeleteSet={deleteSet}
                                        onDeleteBlock={requestDeleteBlock}
                                        swapDisabled={!catalogReady}
                                        onSwapRequest={(blockId) => {
                                            setSwapBlockId(blockId)
                                            setSwapQuery("")
                                        }}
                                    />
                                ))}
                            </ol>
                        </SortableContext>
                    </DndContext>

                    {blocks.length === 0 && (
                        <EmptyState title="아직 운동이 없어요" body="아래 버튼으로 첫 운동을 추가하세요." />
                    )}

                    <Button
                        variant="secondary"
                        block
                        icon={<Plus className="size-4" aria-hidden />}
                        onClick={addNewExerciseBlock}
                        disabled={!catalogReady}
                        loading={catalogStatus === "loading"}
                    >
                        운동 추가
                    </Button>
                </section>
            </div>

            <div className="sticky bottom-0 z-10 mt-auto border-t border-hairline bg-ground px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {invalidReason && (
                    <p role="alert" className="mb-2 text-caption text-danger-ink">
                        {DRAFT_INVALID_MESSAGE[invalidReason]}
                    </p>
                )}
                {finalizeStatus === "failed" && (
                    <p role="alert" className="mb-2 text-caption text-danger-ink">
                        저장하지 못했어요. 다시 시도하세요.
                    </p>
                )}
                <Button
                    variant="primary"
                    size="lg"
                    block
                    line={line}
                    loading={finalizeStatus === "loading"}
                    disabled={!isRoutineValid}
                    onClick={handleFinalize}
                    icon={<Save className="size-5" aria-hidden />}
                >
                    루틴 저장
                </Button>
            </div>

            <Sheet
                open={finalizeStatus === "finalized"}
                onClose={goHomeAfterSave}
                title="루틴을 저장했어요"
                description="바로 출발하거나, 나중에 운동 탭에서 시작할 수 있어요."
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={goHomeAfterSave}>
                            홈으로
                        </Button>
                        <Button variant="primary" size="lg" line={line} onClick={startSavedRoutine}>
                            바로 시작
                        </Button>
                    </div>
                }
            >
                <RouteStrip line={line} label="저장한 루틴" stops={blocks.map((b) => b.exerciseName || "운동")} />
            </Sheet>

            <Sheet
                open={backConfirmOpen}
                onClose={() => setBackConfirmOpen(false)}
                title="편집을 그만둘까요?"
                description="저장하지 않은 변경은 사라져요."
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={() => setBackConfirmOpen(false)}>
                            계속 편집
                        </Button>
                        <Button variant="primary" size="lg" onClick={leaveEditing}>
                            나가기
                        </Button>
                    </div>
                }
            >
                {null}
            </Sheet>

            <Sheet
                open={pendingDeleteBlock !== null}
                onClose={() => setPendingDeleteBlockId(null)}
                title="이 운동을 뺄까요?"
                description={pendingDeleteBlock?.exerciseName ? `${pendingDeleteBlock.exerciseName}을(를) 루틴에서 빼요.` : "이 운동을 루틴에서 빼요."}
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={() => setPendingDeleteBlockId(null)}>
                            취소
                        </Button>
                        <Button variant="danger" size="lg" onClick={confirmDeleteBlock}>
                            빼기
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2">저장하기 전에는 뒤로 가서 편집을 그만두면 원래 루틴으로 돌아가요.</p>
            </Sheet>

            <Sheet open={swapBlockId !== null} onClose={handleCloseSwapModal} title="다른 운동으로 교체" description="이름이나 부위로 찾을 수 있어요.">
                <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                    <input
                        type="search"
                        aria-label="운동 검색"
                        placeholder="벤치프레스, 가슴"
                        value={swapQuery}
                        onChange={(e) => setSwapQuery(e.target.value)}
                        className="min-h-12 w-full rounded-control border border-rail bg-ground pl-9 pr-3 text-body hover:border-ink-3"
                    />
                </div>
                {swapLoading ? (
                    <div className="flex flex-col gap-2" aria-busy="true">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <>
                        {aiCandidates.length > 0 && (
                            <>
                                <p className="mb-1 text-caption font-bold text-ink-2">AI 추천</p>
                                <ul className="mb-4 flex flex-col divide-y divide-hairline">
                                    {aiCandidates.map((item) => (
                                        <SwapOption key={item.id} item={item} recommended onPick={() => replaceExercise(swapBlockId!, item)} />
                                    ))}
                                </ul>
                                <p className="mb-1 text-caption font-bold text-ink-2">전체 운동</p>
                            </>
                        )}
                        {filteredCatalog.length === 0 ? (
                            <EmptyState title="찾는 운동이 없어요" body="다른 이름이나 부위로 검색해 보세요." />
                        ) : (
                            <ul className="flex flex-col divide-y divide-hairline">
                                {filteredCatalog.map((item) => (
                                    <SwapOption key={item.id} item={item} onPick={() => replaceExercise(swapBlockId!, item)} />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </Sheet>
        </div>
    )
}

function SwapOption({ item, recommended, onPick }: { item: ExerciseCatalogItem; recommended?: boolean; onPick: () => void }) {
    return (
        <li>
            <button type="button" onClick={onPick} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left hover:bg-surface">
                <span className="min-w-0">
                    <span className="block truncate text-body font-medium text-ink">{item.nameKr}</span>
                    <span className="block text-caption text-ink-2">
                        {muscleLabel(item.primaryMuscle)} · {equipmentLabel(item.equipment)}
                    </span>
                </span>
                {recommended && <Tag>AI 추천</Tag>}
            </button>
        </li>
    )
}

function blockSummary(block: RoutineBlock, unit: WeightUnit): string {
    const toUnit = (kg: number) => kgToDisplay(kg, unit)
    const weights = block.prescription.map((s) => s.targetWeightKg).filter((kg): kg is number => kg !== null && kg > 0).map(toUnit)
    const reps = block.prescription.map((s) => s.targetReps)
    const weightText =
        weights.length === 0 ? "맨몸" : Math.min(...weights) === Math.max(...weights) ? `${weights[0]}${unit}` : `${Math.min(...weights)}–${Math.max(...weights)}${unit}`
    const repsText = reps.length === 0 ? "" : Math.min(...reps) === Math.max(...reps) ? `${reps[0]}회` : `${Math.min(...reps)}–${Math.max(...reps)}회`
    return [`${block.prescription.length}세트`, weightText, repsText].filter(Boolean).join(" · ")
}

interface StationProps {
    block: RoutineBlock
    line: RouteLine
    isLast: boolean
    expanded: boolean
    onToggle: () => void
    displayUnit: WeightUnit
    onUpdateSet: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRestTime: (blockId: string, arrayIndex: number, value: number) => void
    onAddSet: (blockId: string) => void
    onDeleteSet: (blockId: string, arrayIndex: number) => void
    onDeleteBlock: (blockId: string) => void
    onSwapRequest: (blockId: string) => void
    swapDisabled: boolean
}

function SortableStation({ block, line, isLast, expanded, onToggle, displayUnit, onUpdateSet, onUpdateRestTime, onAddSet, onDeleteSet, onDeleteBlock, onSwapRequest, swapDisabled }: StationProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.clientBlockId! })
    const color = ROUTE_LINE_COLOR_VAR[line]
    const blockId = block.clientBlockId!
    const name = block.exerciseName || "운동을 선택하세요"
    const editorId = `${blockId}-editor`

    return (
        <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx(isDragging && "relative z-10 opacity-70")}>
            <StationRow
                color={color}
                markerColor={color}
                segmentColor={isLast ? undefined : color}
                isCurrent={false}
                isDone={false}
                isLast={isLast}
                station={{
                    title: (
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-expanded={expanded}
                            aria-controls={editorId}
                            className={cx("flex min-h-11 max-w-full items-center gap-1 text-left", !block.exerciseName && "text-ink-3")}
                        >
                            <span className="truncate">{name}</span>
                            <ChevronDown className={cx("size-4 shrink-0 text-ink-3 transition-transform duration-150", expanded && "rotate-180")} aria-hidden />
                        </button>
                    ),
                    trailing: (
                        <button
                            type="button"
                            {...attributes}
                            {...listeners}
                            aria-label={`${name} 순서 바꾸기`}
                            className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-ink-3 hover:bg-surface active:cursor-grabbing"
                        >
                            <GripVertical className="size-5" aria-hidden />
                        </button>
                    ),
                    meta: blockSummary(block, displayUnit),
                    content: (
                        <div className="flex flex-col gap-3">
                            {block.exerciseRationale && (
                                <p className={cx("text-body-sm text-ink-2", !expanded && "line-clamp-2")}>{block.exerciseRationale}</p>
                            )}
                            {expanded && (
                                <div id={editorId} className="flex flex-col gap-3 rounded-panel bg-surface p-3">
                                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 text-caption font-bold text-ink-2">
                                        <span>세트</span>
                                        <span>무게({displayUnit})</span>
                                        <span>횟수</span>
                                        <span className="sr-only">삭제</span>
                                    </div>
                                    <ol className="flex flex-col divide-y divide-hairline">
                                        {block.prescription.map((set, arrayIndex) => (
                                            <SetRow
                                                key={arrayIndex}
                                                set={set}
                                                arrayIndex={arrayIndex}
                                                blockId={blockId}
                                                displayUnit={displayUnit}
                                                onUpdate={onUpdateSet}
                                                onUpdateRest={onUpdateRestTime}
                                                onDelete={onDeleteSet}
                                                isOnly={block.prescription.length === 1}
                                            />
                                        ))}
                                    </ol>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => onAddSet(blockId)}>
                                            세트 추가
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            icon={<Repeat className="size-4" aria-hidden />}
                                            onClick={() => onSwapRequest(blockId)}
                                            disabled={swapDisabled}
                                        >
                                            운동 교체
                                        </Button>
                                    </div>
                                    <Button variant="danger-ghost" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => onDeleteBlock(blockId)}>
                                        이 운동 빼기
                                    </Button>
                                </div>
                            )}
                        </div>
                    ),
                }}
            />
        </li>
    )
}

interface SetRowProps {
    set: SetPrescription
    arrayIndex: number
    blockId: string
    displayUnit: WeightUnit
    onUpdate: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRest: (blockId: string, arrayIndex: number, value: number) => void
    onDelete: (blockId: string, arrayIndex: number) => void
    isOnly: boolean
}

const SET_INPUT_BASE =
    "min-h-11 rounded-control border border-rail bg-ground px-2 text-center text-body font-bold tabular-nums text-ink hover:border-ink-3 aria-[invalid=true]:border-danger"
const SET_INPUT = `${SET_INPUT_BASE} w-full`

function SetRow({ set, arrayIndex, blockId, displayUnit, onUpdate, onUpdateRest, onDelete, isOnly }: SetRowProps) {
    // Text is held only while a field is focused, so the user can clear it mid-typing. Outside focus the
    // field always shows the stored value (kg in the model; only the view converts).
    const [editing, setEditing] = useState<{ field: SetField; text: string } | null>(null)
    const [errors, setErrors] = useState<Partial<Record<SetField, string>>>({})
    const setNo = arrayIndex + 1

    const storedText: Record<SetField, string> = {
        weight: formatWeight(set.targetWeightKg, displayUnit),
        reps: String(set.targetReps),
        rest: String(set.targetRestSec),
    }

    const commit = (field: SetField, value: number | null) => {
        if (field === "weight") onUpdate(blockId, arrayIndex, "targetWeightKg", value)
        else if (field === "reps") onUpdate(blockId, arrayIndex, "targetReps", value)
        else if (value !== null) onUpdateRest(blockId, arrayIndex, value)
    }

    const clearError = (field: SetField) => setErrors((prev) => ({ ...prev, [field]: undefined }))

    const fieldProps = (field: SetField) => ({
        value: editing?.field === field ? editing.text : storedText[field],
        "aria-invalid": errors[field] ? true : undefined,
        onFocus: () => setEditing({ field, text: storedText[field] }),
        onChange: (e: ChangeEvent<HTMLInputElement>) => setEditing({ field, text: e.target.value }),
        onBlur: () => {
            const text = editing?.field === field ? editing.text : storedText[field]
            setEditing(null)
            if (text === storedText[field]) {
                clearError(field)
                return
            }
            const parsed = parseSetInput(field, text, displayUnit)
            if (parsed.ok) {
                clearError(field)
                commit(field, parsed.value)
            } else {
                // Invalid input reverts to the stored value, so what is shown is what gets saved.
                setErrors((prev) => ({ ...prev, [field]: `${parsed.message} 이전 값으로 되돌렸어요.` }))
            }
        },
        onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") e.currentTarget.blur()
        },
    })

    const handleRestStep = (delta: number) => {
        const next = Math.min(NUMERIC_RANGES.restSec.max, Math.max(NUMERIC_RANGES.restSec.min, set.targetRestSec + delta))
        clearError("rest")
        onUpdateRest(blockId, arrayIndex, next)
    }

    const errorText = [errors.weight, errors.reps, errors.rest].filter((m): m is string => Boolean(m))

    return (
        <li className="flex flex-col gap-2 py-2.5">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2">
                <span className="text-body-sm font-bold tabular-nums text-ink">{setNo}</span>
                <input
                    type="number"
                    inputMode="decimal"
                    aria-label={`${setNo}세트 무게(${displayUnit})`}
                    min={0}
                    max={toDisplayBound(DRAFT_WEIGHT_MAX_KG, displayUnit)}
                    step={displayUnit === "lbs" ? 1 : 0.1}
                    {...fieldProps("weight")}
                    placeholder="맨몸"
                    className={SET_INPUT}
                />
                <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`${setNo}세트 횟수`}
                    min={NUMERIC_RANGES.reps.min}
                    max={NUMERIC_RANGES.reps.max}
                    step={NUMERIC_RANGES.reps.step}
                    {...fieldProps("reps")}
                    className={SET_INPUT}
                />
                <button
                    type="button"
                    onClick={() => onDelete(blockId, arrayIndex)}
                    disabled={isOnly}
                    aria-label={`${setNo}세트 삭제`}
                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-3 hover:bg-ground hover:text-danger-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <Trash2 className="size-4" aria-hidden />
                </button>
            </div>
            <div className="ml-10 flex items-center gap-2">
                <span className="text-caption text-ink-2">휴식</span>
                <button
                    type="button"
                    onClick={() => handleRestStep(-30)}
                    disabled={set.targetRestSec <= 0}
                    aria-label={`${setNo}세트 휴식 30초 줄이기`}
                    className="inline-flex size-11 items-center justify-center rounded-control border border-rail bg-ground text-ink hover:border-ink-3 disabled:opacity-30"
                >
                    <Minus className="size-4" aria-hidden />
                </button>
                <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`${setNo}세트 휴식(초)`}
                    min={NUMERIC_RANGES.restSec.min}
                    max={NUMERIC_RANGES.restSec.max}
                    step={NUMERIC_RANGES.restSec.step}
                    {...fieldProps("rest")}
                    className={cx(SET_INPUT_BASE, "w-20")}
                />
                <span className="text-caption text-ink-2">초</span>
                <button
                    type="button"
                    onClick={() => handleRestStep(30)}
                    aria-label={`${setNo}세트 휴식 30초 늘리기`}
                    className="inline-flex size-11 items-center justify-center rounded-control border border-rail bg-ground text-ink hover:border-ink-3"
                >
                    <Plus className="size-4" aria-hidden />
                </button>
            </div>
            {errorText.length > 0 && (
                <p role="alert" className="ml-10 text-caption text-danger-ink">
                    {errorText.join(" ")}
                </p>
            )}
        </li>
    )
}
