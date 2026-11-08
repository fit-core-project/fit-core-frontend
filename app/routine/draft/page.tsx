"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
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
import { useForm } from "react-hook-form"
import { NUMERIC_RANGES, NumericFieldName, numericRules, toDisplayBound, validateNumericRange } from "@/utils/numericValidation"
import { equipmentLabel, fallbackReasonLabel, muscleLabel, routineOriginLabel } from "@/utils/displayLabels"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import { Button, ButtonLink, cx, EmptyState, LineBadge, Notice, RouteStrip, Sheet, Skeleton, StationRow, Tag } from "@/components/ui"

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

    const line = useMemo(() => lineForRoutine(null, draft?.routineBlocks.flatMap((block) => block.primaryMuscles ?? []) ?? []), [draft])

    // 1. Load routine + catalog, then apply weights to all blocks
    useEffect(() => {
        const init = async () => {
            try {
                const [catalogData, saved] = await Promise.all([
                    getExerciseCatalog(),
                    Promise.resolve(localStorage.getItem("fitcore_active_routine")),
                ])
                setCatalog(catalogData)

                if (!saved) return
                const data = JSON.parse(saved) as RoutineDraft
                const hydratedDraft: RoutineDraft = {
                    ...data,
                    routineBlocks: data.routineBlocks.map((block, index) => ({
                        ...block,
                        clientBlockId: block.clientBlockId ?? `cbid_${Date.now()}_${index}`,
                    })),
                }
                initialDraftRef.current = JSON.parse(JSON.stringify(hydratedDraft))
                setDraft(hydratedDraft)
            } catch (err) {
                console.error("루틴 초기화 오류:", err)
            } finally {
                setFinalizeStatus("idle")
            }
        }
        init()
    }, [])

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

    const deleteBlock = (blockId: string) => {
        if (!draft) return
        if (!confirm("이 운동을 루틴에서 삭제할까요?")) return
        setDraft({ ...draft, routineBlocks: draft.routineBlocks.filter((b) => b.clientBlockId !== blockId) })
    }

    const updateRestTime = (blockId: string, arrayIndex: number, value: number) => {
        updateSet(blockId, arrayIndex, "targetRestSec", value)
    }

    const handleCloseSwapModal = () => {
        if (swapBlockId && draft) {
            const block = draft.routineBlocks.find((b) => b.clientBlockId === swapBlockId)
            if (block && !block.exerciseId) {
                setDraft({ ...draft, routineBlocks: draft.routineBlocks.filter((b) => b.clientBlockId !== swapBlockId) })
            }
        }
        setSwapBlockId(null)
        setSwapQuery("")
    }

    const addNewExerciseBlock = () => {
        if (!draft) return
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
            const enrichedBlock = await applyRecentRecordDefaults(baseBlock, item.id)

            setDraft((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    routineBlocks: prev.routineBlocks.map((b) => (b.clientBlockId !== blockId ? b : enrichedBlock)),
                }
            })
        } finally {
            setSwapBlockId(null)
            setSwapQuery("")
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

    // Validation: gate finalize when any set violates bounds
    const isRoutineValid = useMemo(() => {
        if (!draft) return false
        if (isManualMode && draft.routineBlocks.length === 0) return false
        return draft.routineBlocks.every(
            (block) =>
                block.prescription.length > 0 &&
                block.prescription.every(
                    (s) =>
                        s.targetReps >= 1 &&
                        s.targetReps <= 50 &&
                        (s.targetWeightKg === null || (s.targetWeightKg > 0 && s.targetWeightKg <= 500)) &&
                        s.targetRestSec >= 0 &&
                        s.targetRestSec <= 600
                )
        )
    }, [draft, isManualMode])

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
                                "min-h-9 min-w-11 rounded-[4px] px-2 text-body-sm font-bold",
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
                                        onDeleteBlock={deleteBlock}
                                        onSwapRequest={(blockId) => {
                                            setSwapBlockId(blockId)
                                            setSwapQuery("")
                                        }}
                                    />
                                ))}
                            </ol>
                        </SortableContext>
                    </DndContext>

                    {isManualMode && blocks.length === 0 && (
                        <EmptyState title="아직 운동이 없어요" body="아래 버튼으로 첫 운동을 추가하세요." />
                    )}

                    <Button variant="secondary" block icon={<Plus className="size-4" aria-hidden />} onClick={addNewExerciseBlock}>
                        운동 추가
                    </Button>
                </section>
            </div>

            <div className="sticky bottom-0 z-10 mt-auto border-t border-hairline bg-ground px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {!isRoutineValid && (
                    <p role="alert" className="mb-2 text-caption text-danger-ink">
                        세트 값을 확인하세요. 횟수 1~50, 무게 0~500kg, 휴식 0~600초 안이어야 해요.
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

function blockSummary(block: RoutineBlock, unit: "kg" | "lbs"): string {
    const toUnit = (kg: number) => (unit === "lbs" ? Math.round(kg * 2.20462) : kg)
    const weights = block.prescription.map((s) => s.targetWeightKg).filter((kg): kg is number => kg !== null).map(toUnit)
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
    displayUnit: "kg" | "lbs"
    onUpdateSet: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRestTime: (blockId: string, arrayIndex: number, value: number) => void
    onAddSet: (blockId: string) => void
    onDeleteSet: (blockId: string, arrayIndex: number) => void
    onDeleteBlock: (blockId: string) => void
    onSwapRequest: (blockId: string) => void
}

function SortableStation({ block, line, isLast, expanded, onToggle, displayUnit, onUpdateSet, onUpdateRestTime, onAddSet, onDeleteSet, onDeleteBlock, onSwapRequest }: StationProps) {
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
                                        <Button variant="secondary" icon={<Repeat className="size-4" aria-hidden />} onClick={() => onSwapRequest(blockId)}>
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
    displayUnit: "kg" | "lbs"
    onUpdate: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRest: (blockId: string, arrayIndex: number, value: number) => void
    onDelete: (blockId: string, arrayIndex: number) => void
    isOnly: boolean
}

function validateDraftSetValue(field: NumericFieldName, value: number, unit: "kg" | "lbs" = "kg") {
    return validateNumericRange(field, value, unit) === true
}

const SET_INPUT_BASE =
    "min-h-11 rounded-control border border-rail bg-ground px-2 text-center text-body font-bold tabular-nums text-ink hover:border-ink-3 aria-[invalid=true]:border-danger"
const SET_INPUT = `${SET_INPUT_BASE} w-full`

function SetRow({ set, arrayIndex, blockId, displayUnit, onUpdate, onUpdateRest, onDelete, isOnly }: SetRowProps) {
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({ mode: "onChange" })
    const weightRegister = register("weightKg", numericRules("weightKg", displayUnit))
    const repsRegister = register("reps", numericRules("reps"))
    const restRegister = register("restSec", numericRules("restSec"))
    // The model always stores kg; only the view converts.
    const weightDisplay =
        set.targetWeightKg === null ? "" : displayUnit === "lbs" ? String(Math.round(set.targetWeightKg * 2.20462)) : String(set.targetWeightKg)
    const setNo = arrayIndex + 1

    const handleWeightChange = (raw: string) => {
        if (raw === "") {
            onUpdate(blockId, arrayIndex, "targetWeightKg", null)
            return
        }
        const num = parseFloat(raw)
        if (!isNaN(num) && validateDraftSetValue("weightKg", num, displayUnit)) {
            const kg = displayUnit === "lbs" ? Math.round(num / 2.20462) : num
            onUpdate(blockId, arrayIndex, "targetWeightKg", kg)
        }
    }

    const handleRepsChange = (raw: string) => {
        const num = parseInt(raw)
        if (!isNaN(num) && validateDraftSetValue("reps", num)) onUpdate(blockId, arrayIndex, "targetReps", num)
    }

    const handleRestStep = (delta: number) => {
        const next = Math.min(NUMERIC_RANGES.restSec.max, Math.max(NUMERIC_RANGES.restSec.min, set.targetRestSec + delta))
        onUpdateRest(blockId, arrayIndex, next)
    }

    const handleRestChange = (raw: string) => {
        const num = parseInt(raw)
        if (!isNaN(num) && validateDraftSetValue("restSec", num)) onUpdateRest(blockId, arrayIndex, num)
    }

    const errorText = [errors.weightKg?.message, errors.reps?.message, errors.restSec?.message].filter(Boolean).map(String)

    return (
        <li className="flex flex-col gap-2 py-2.5">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2">
                <span className="text-body-sm font-bold tabular-nums text-ink">{setNo}</span>
                <input
                    type="number"
                    inputMode="decimal"
                    aria-label={`${setNo}세트 무게(${displayUnit})`}
                    aria-invalid={errors.weightKg ? true : undefined}
                    min={toDisplayBound(NUMERIC_RANGES.weightKg.min, displayUnit)}
                    max={toDisplayBound(NUMERIC_RANGES.weightKg.max, displayUnit)}
                    step={displayUnit === "lbs" ? 1 : NUMERIC_RANGES.weightKg.step}
                    value={weightDisplay}
                    onChange={(e) => {
                        weightRegister.onChange(e)
                        handleWeightChange(e.target.value)
                        void trigger("weightKg")
                    }}
                    placeholder="맨몸"
                    className={SET_INPUT}
                />
                <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`${setNo}세트 횟수`}
                    aria-invalid={errors.reps ? true : undefined}
                    min={NUMERIC_RANGES.reps.min}
                    max={NUMERIC_RANGES.reps.max}
                    step={NUMERIC_RANGES.reps.step}
                    value={set.targetReps}
                    onChange={(e) => {
                        repsRegister.onChange(e)
                        handleRepsChange(e.target.value)
                        void trigger("reps")
                    }}
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
                    aria-invalid={errors.restSec ? true : undefined}
                    min={NUMERIC_RANGES.restSec.min}
                    max={NUMERIC_RANGES.restSec.max}
                    step={NUMERIC_RANGES.restSec.step}
                    value={set.targetRestSec}
                    onChange={(e) => {
                        restRegister.onChange(e)
                        handleRestChange(e.target.value)
                        void trigger("restSec")
                    }}
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
