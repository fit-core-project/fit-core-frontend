"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, Trash2, Plus, Save, X, Info, Search, GripVertical, ArrowLeft } from "lucide-react"
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
import { FinalizeState } from "@/types/state"
import { useForm } from "react-hook-form"
import { NUMERIC_RANGES, NumericFieldName, numericRules, toDisplayBound, validateNumericRange } from "@/utils/numericValidation"

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

function fallbackReasonLabel(reasonCode: RoutineDraft["statusReasonCode"]): string {
    switch (reasonCode) {
        case "llmTimeout":
            return "AI \uc751\ub2f5 \uc9c0\uc5f0"
        case "schemaError":
            return "AI \uc751\ub2f5 \ud615\uc2dd \uc624\ub958"
        case "networkError":
            return "AI \uc5f0\uacb0 \uc2e4\ud328"
        case "ai_server_unavailable":
        case "ai_connection_refused":
            return "AI \uc11c\ubc84 \uc5f0\uacb0 \uc2e4\ud328"
        case "ai_timeout":
            return "AI \uc751\ub2f5 \uc9c0\uc5f0"
        case "ai_bad_response":
        case "ai_schema_mismatch":
            return "AI \uc751\ub2f5 \ud615\uc2dd \uc624\ub958"
        case "ai_remote_error":
            return "AI \uc11c\ubc84 \uc751\ub2f5 \uc624\ub958"
        case "ai_disabled":
            return "AI \uae30\ub2a5 \ube44\ud65c\uc131\ud654"
        case "unknown_ai_error":
            return "AI \uc751\ub2f5 \uc0ac\uc6a9 \ubd88\uac00"
        case "emptyCandidate":
            return "\uc0ac\uc6a9 \uac00\ub2a5\ud55c \uc6b4\ub3d9 \ud6c4\ubcf4 \uc5c6\uc74c"
        default:
            return "\uc548\uc804 \ub300\uccb4"
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

    // DnD sensors
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    // Exercise swap state
    const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([])
    const [swapBlockId, setSwapBlockId] = useState<string | null>(null)
    const [swapQuery, setSwapQuery] = useState("")
    const [swapLoading, setSwapLoading] = useState(false)

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
                exerciseRationale: `${item.primaryMuscle} 주동근 운동 (${item.equipment})`,
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
    }, [draft])

    const swapBlock = useMemo(
        () => (swapBlockId && draft ? (draft.routineBlocks.find((b) => b.clientBlockId === swapBlockId) ?? null) : null),
        [swapBlockId, draft]
    )

    const aiCandidates = useMemo(() => {
        if (!swapBlock?.substitutionCandidates?.length) return []
        const candidateIds = new Set(swapBlock.substitutionCandidates.map((c) => c.exerciseId))
        return (Array.isArray(catalog) ? catalog : []).filter((item) => candidateIds.has(item.id))
    }, [swapBlock, catalog])

    const filteredCatalog = useMemo(
        () =>
            // guard: catalog may arrive as non-array; fall back to [] before filter
            (Array.isArray(catalog) ? catalog : []).filter(
                (item) =>
                    item.nameKr?.includes(swapQuery) ||
                    item.nameEn?.toLowerCase().includes(swapQuery.toLowerCase()) ||
                    item.primaryMuscle.includes(swapQuery)
            ),
        [catalog, swapQuery]
    )

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
            targetWorkoutDate: new Date().toISOString().split("T")[0],
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

    const handleBack = () => {
        if (window.confirm("편집 내용이 사라질 수 있어요. 돌아갈까요?")) {
            router.push("/ai_routine/generator")
        }
    }

    if (finalizeStatus === "loading" && !draft) return <div className="p-10 text-center text-slate-500">루틴 불러오는 중...</div>
    if (!draft) return <div className="p-10 text-center text-slate-500">저장된 루틴이 없습니다.</div>

    return (
        <div className="flex flex-col w-full">

            {/* 상단 뒤로가기 */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-2 flex items-center shadow-sm">
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    뒤로
                </button>
            </div>

            {/* Fallback warning banner */}
            {draft.isFallback && (
                <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                                기본 루틴
                            </span>
                            <span className="text-xs font-bold text-amber-700">
                                {fallbackReasonLabel(draft.statusReasonCode)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-amber-900">
                            현재 AI 코치에 연결할 수 없어 기본 루틴을 제공하고 있습니다.
                            <br />
                            개인화 수준이 제한될 수 있습니다.
                        </p>
                    </div>
                </div>
            )}
        <div className="flex flex-col w-full max-w-2xl mx-auto p-4 space-y-6 pb-44">

            {/* Status badge + estimated time */}
            <div
                className={`p-4 rounded-2xl flex items-center justify-between ${
                    draft.isFallback ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"
                }`}
            >
                <div className="flex items-center space-x-3">
                    {draft.isFallback ? (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm">
                            {draft.isFallback ? "기본 루틴" : "AI 추천 루틴"}
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-mono">
                            {draft.isFallback ? "개인화 제한" : draft.statusReasonCode}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* kg / lbs toggle */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setDisplayUnit("kg")}
                            className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${
                                displayUnit === "kg"
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            kg
                        </button>
                        <button
                            onClick={() => setDisplayUnit("lbs")}
                            className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${
                                displayUnit === "lbs"
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            lbs
                        </button>
                    </div>
                    <span className="text-blue-600 font-bold flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {totalTime}분
                    </span>
                </div>
            </div>

            {/* Routine summary card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                <h1 className="text-lg font-extrabold text-slate-800">{draft.summaryTitle}</h1>

                {draft.warnings.length > 0 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <ul className="space-y-0.5">
                            {draft.warnings.map((w, i) => (
                                <li key={i} className="text-xs text-amber-700 font-medium">
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <ul className="space-y-1">
                        {draft.rationaleSummary.map((line, i) => (
                            <li key={i} className="text-xs text-slate-600 leading-relaxed">
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Exercise block list */}
            <section className="space-y-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }: DragEndEvent) => {
                        if (over && active.id !== over.id)
                            reorderBlocks(String(active.id), String(over.id))
                    }}
                >
                    <SortableContext
                        items={draft.routineBlocks.map((b) => b.clientBlockId!)}
                        strategy={verticalListSortingStrategy}
                    >
                        {draft.routineBlocks.map((block) => (
                            <SortableExerciseCard
                                key={block.clientBlockId}
                                block={block}
                                isFallback={draft.isFallback}
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
                    </SortableContext>
                </DndContext>

                <button
                    onClick={addNewExerciseBlock}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 font-bold hover:bg-slate-50 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> 운동 추가
                </button>
            </section>

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {!isRoutineValid && (
                    <p className="text-center text-xs text-red-500 font-bold mb-2">
                        세트 값이 유효하지 않습니다 (횟수 1~50, 무게 0~500, 휴식 0~600초)
                    </p>
                )}
                {finalizeStatus === "failed" && (
                    <p className="text-center text-xs text-red-500 font-bold mb-2">
                        루틴 저장에 실패했습니다. 다시 시도해 주세요.
                    </p>
                )}
                <button
                    onClick={handleFinalize}
                    disabled={finalizeStatus === "loading" || !isRoutineValid}
                    className="w-full max-w-2xl mx-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] block"
                >
                    <Save className="w-5 h-5" /> {finalizeStatus === "loading" ? "저장 중..." : "루틴 저장"}
                </button>
            </div>

            {finalizeStatus === "finalized" && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="routine-save-complete-title"
                    onClick={goHomeAfterSave}
                >
                    <div
                        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={goHomeAfterSave}
                                aria-label="홈으로 이동하며 닫기"
                                className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 id="routine-save-complete-title" className="text-xl font-extrabold text-slate-900">
                            루틴 저장이 완료되었습니다.
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                            지금 바로 운동을 시작하거나 홈으로 이동할 수 있습니다.
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={goHomeAfterSave}
                                className="rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 active:scale-[0.98]"
                            >
                                홈으로
                            </button>
                            <button
                                type="button"
                                onClick={startSavedRoutine}
                                className="rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 active:scale-[0.98]"
                            >
                                바로 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise swap modal */}
            {swapBlockId && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                            <h3 className="font-bold text-slate-800 text-base">{"\uc6b4\ub3d9 \uad50\uccb4"}</h3>
                            <button
                                onClick={() => setSwapBlockId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="p-4 border-b border-slate-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="운동 이름, 근육 검색..."
                                    value={swapQuery}
                                    onChange={(e) => setSwapQuery(e.target.value)}
                                    autoFocus
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>

                        {/* Exercise list */}
                        <div className="overflow-y-auto flex-1">
                            {swapLoading ? (
                                <div className="p-10 text-center text-slate-400 text-sm animate-pulse">
                                    운동 정보 불러오는 중...
                                </div>
                            ) : (
                                <>
                                    {/* AI candidates */}
                                    {aiCandidates.length > 0 && (
                                        <div>
                                            <p className="px-5 pt-4 pb-2 text-[10px] font-black text-purple-500 uppercase tracking-widest">
                                                ✨ AI 추천 운동
                                            </p>
                                            {aiCandidates.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => replaceExercise(swapBlockId, item)}
                                                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-purple-50 transition-colors border-b border-slate-50 text-left bg-purple-50/40"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{item.nameKr}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {item.primaryMuscle} · {item.equipment}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 border border-purple-200 px-2 py-1 rounded-full shrink-0">
                                                        AI
                                                    </span>
                                                </button>
                                            ))}
                                            <p className="px-5 pt-4 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                전체 운동
                                            </p>
                                        </div>
                                    )}

                                    {/* All exercises list */}
                                    {filteredCatalog.length === 0 ? (
                                        <div className="p-10 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
                                    ) : (
                                        filteredCatalog.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => replaceExercise(swapBlockId, item)}
                                                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 transition-colors border-b border-slate-50 text-left"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{item.nameKr}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {item.primaryMuscle} · {item.equipment}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full shrink-0">
                                                    T{item.tier}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    )
}

// SortableExerciseCard

function SortableExerciseCard(props: ExerciseCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: props.block.clientBlockId! })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={isDragging ? "opacity-50 z-10 relative" : ""}
        >
            <ExerciseCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
    )
}

// ExerciseCard

interface ExerciseCardProps {
    block: RoutineBlock
    isFallback: boolean
    displayUnit: "kg" | "lbs"
    onUpdateSet: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRestTime: (blockId: string, arrayIndex: number, value: number) => void
    onAddSet: (blockId: string) => void
    onDeleteSet: (blockId: string, arrayIndex: number) => void
    onDeleteBlock: (blockId: string) => void
    onSwapRequest: (blockId: string) => void
    dragHandleProps?: Record<string, unknown>
}

function ExerciseCard({
    block,
    isFallback,
    displayUnit,
    onUpdateSet,
    onUpdateRestTime,
    onAddSet,
    onDeleteSet,
    onDeleteBlock,
    onSwapRequest,
    dragHandleProps,
}: ExerciseCardProps) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
            <button
                onClick={() => onDeleteBlock(block.clientBlockId!)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
            >
                <Trash2 className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pr-10 mb-1">
                <div
                    {...dragHandleProps}
                    className="p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
                <h4 className="min-w-0 font-bold text-slate-800 truncate">
                    {block.exerciseName || <span className="text-slate-300 font-medium">운동을 선택하세요</span>}
                </h4>
            </div>
            {isFallback && (
                <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                    <AlertCircle className="h-3 w-3" />
                    기본 루틴
                </div>
            )}
            {block.exerciseRationale && (
                <p className="pr-10 text-xs text-slate-500 mt-1 mb-4 leading-relaxed whitespace-pre-wrap break-words">
                    {block.exerciseRationale}
                </p>
            )}

            {/* Set table header */}
            <div className="grid grid-cols-[1.25rem_1fr_1fr_3rem_1.25rem] gap-x-1.5 mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">SET</span>
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">{displayUnit.toUpperCase()}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">REPS</span>
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">REST</span>
                <span />
            </div>

            {/* Set rows */}
            <div className="space-y-1.5">
                {block.prescription.map((set, arrayIndex) => (
                    <SetRow
                        key={arrayIndex}
                        set={set}
                        arrayIndex={arrayIndex}
                        blockId={block.clientBlockId!}
                        displayUnit={displayUnit}
                        onUpdate={onUpdateSet}
                        onUpdateRest={onUpdateRestTime}
                        onDelete={onDeleteSet}
                        isOnly={block.prescription.length === 1}
                    />
                ))}
            </div>

            <button
                onClick={() => onAddSet(block.clientBlockId!)}
                className="w-full mt-3 py-2 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400 font-bold hover:bg-slate-50 hover:border-blue-200 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
            >
                <Plus className="w-3.5 h-3.5" /> 세트 추가
            </button>

            <button
                onClick={() => onSwapRequest(block.clientBlockId!)}
                className="w-full mt-2 py-2 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400 font-bold hover:bg-slate-50 hover:border-purple-200 hover:text-purple-500 transition-colors"
            >
                다른 운동으로 교체 ↻
            </button>
        </div>
    )
}

// SetRow

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

function SetRow({ set, arrayIndex, blockId, displayUnit, onUpdate, onUpdateRest, onDelete, isOnly }: SetRowProps) {
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({ mode: "onChange" })
    const weightRegister = register("weightKg", numericRules("weightKg", displayUnit))
    const repsRegister = register("reps", numericRules("reps"))
    const restRegister = register("restSec", numericRules("restSec"))
    // View converts kg→lbs when needed; model always stores kg
    const weightDisplay =
        set.targetWeightKg === null
            ? ""
            : displayUnit === "lbs"
              ? String(Math.round(set.targetWeightKg * 2.20462))
              : String(set.targetWeightKg)

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

    return (
        <div className="grid grid-cols-[1.25rem_1fr_1fr_3rem_1.25rem] gap-x-1.5 items-start">
            <span className="text-xs font-black text-slate-500 text-center">{arrayIndex + 1}</span>

            <div>
                <input
                    type="number"
                    min={toDisplayBound(NUMERIC_RANGES.weightKg.min, displayUnit)}
                    max={toDisplayBound(NUMERIC_RANGES.weightKg.max, displayUnit)}
                    step={displayUnit === "lbs" ? 1 : NUMERIC_RANGES.weightKg.step}
                    value={weightDisplay}
                    onChange={(e) => {
                        weightRegister.onChange(e)
                        handleWeightChange(e.target.value)
                        void trigger("weightKg")
                    }}
                    placeholder="BW"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-2 text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.weightKg?.message && <p className="mt-1 text-[10px] text-red-600">{String(errors.weightKg.message)}</p>}
            </div>

            <div>
                <input
                    type="number"
                    min={NUMERIC_RANGES.reps.min}
                    max={NUMERIC_RANGES.reps.max}
                    step={NUMERIC_RANGES.reps.step}
                    value={set.targetReps}
                    onChange={(e) => {
                        repsRegister.onChange(e)
                        handleRepsChange(e.target.value)
                        void trigger("reps")
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-2 text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.reps?.message && <p className="mt-1 text-[10px] text-red-600">{String(errors.reps.message)}</p>}
            </div>

            <div className="flex flex-col items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => handleRestStep(30)}
                    className="w-full text-[9px] font-bold text-slate-400 hover:text-blue-500 leading-none py-0.5 hover:bg-blue-50 rounded transition-colors"
                >
                    ▲
                </button>
                <input
                    type="number"
                    min={NUMERIC_RANGES.restSec.min}
                    max={NUMERIC_RANGES.restSec.max}
                    step={NUMERIC_RANGES.restSec.step}
                    value={set.targetRestSec}
                    onChange={(e) => {
                        restRegister.onChange(e)
                        handleRestChange(e.target.value)
                        void trigger("restSec")
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-0.5 py-0.5 text-[10px] font-black text-center text-slate-600 tabular-nums leading-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.restSec?.message && <p className="mt-1 text-[10px] text-red-600">{String(errors.restSec.message)}</p>}
                <button
                    type="button"
                    onClick={() => handleRestStep(-30)}
                    disabled={set.targetRestSec <= 0}
                    className="w-full text-[9px] font-bold text-slate-400 hover:text-blue-500 leading-none py-0.5 hover:bg-blue-50 rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    ▼
                </button>
            </div>

            <button
                onClick={() => onDelete(blockId, arrayIndex)}
                disabled={isOnly}
                className="flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
