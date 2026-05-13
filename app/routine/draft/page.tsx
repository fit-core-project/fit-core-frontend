"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, Trash2, Plus, Save, X, Info, Search } from "lucide-react"
import { RoutineDraft, RoutineBlock, SetPrescription } from "@/types/routine"
import { getExerciseCatalog, getRecentRecord } from "@/services/exerciseService"
import { ExerciseCatalogItem } from "@/services/mockDataFactory"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { generateEditSummary } from "@/utils/routineDiff"
import { FinalizeState } from "@/types/state"

// ── applyWeightToAllSets ─────────────────────────────────────────────────────
// exerciseId로 최근 기록을 조회해 블록의 모든 세트에 중량/횟수를 일괄 적용한다.
async function applyWeightToAllSets(block: RoutineBlock, exerciseId: string): Promise<RoutineBlock> {
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
    const [displayUnit, setDisplayUnit] = useState<"kg" | "lbs">("kg")
    const initialDraftRef = useRef<RoutineDraft | null>(null)

    // ── Exercise swap state ─────────────────────────────────────────────────
    const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([])
    const [swapBlockId, setSwapBlockId] = useState<string | null>(null)
    const [swapQuery, setSwapQuery] = useState("")
    const [swapLoading, setSwapLoading] = useState(false)

    // ── 1. Load routine + catalog, then apply weights to all blocks ─────────
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
                initialDraftRef.current = JSON.parse(JSON.stringify(data))

                // 카탈로그에서 exerciseName → exerciseId 매핑 후 전 세트 중량 일괄 적용
                const enrichedBlocks = await Promise.all(
                    data.routineBlocks.map((block) => {
                        // 백엔드가 준 exerciseId를 그대로 직행시킵니다! (카탈로그 검색 불필요)
                        return block.exerciseId ? applyWeightToAllSets(block, block.exerciseId) : Promise.resolve(block)
                    })
                )
                setDraft({ ...data, routineBlocks: enrichedBlocks })
            } catch (err) {
                console.error("루틴 로드 실패:", err)
            } finally {
                setFinalizeStatus("idle")
            }
        }
        init()
    }, [])

    // ── Set / Block mutations (keep existing logic) ─────────────────────────

    const updateSet = (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => {
        if (!draft) return
        setDraft({
            ...draft,
            routineBlocks: draft.routineBlocks.map((block) =>
                block.exerciseId !== blockId
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
                if (block.exerciseId !== blockId) return block
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
                if (block.exerciseId !== blockId) return block
                const updated = block.prescription.filter((_, i) => i !== arrayIndex)
                return { ...block, prescription: updated.map((s, i) => ({ ...s, setIndex: i + 1 })) }
            }),
        })
    }

    const deleteBlock = (blockId: string) => {
        if (!draft) return
        if (!confirm("이 운동을 루틴에서 삭제할까요?")) return
        setDraft({ ...draft, routineBlocks: draft.routineBlocks.filter((b) => b.exerciseId !== blockId) })
    }

    const updateRestTime = (blockId: string, arrayIndex: number, value: number) => {
        updateSet(blockId, arrayIndex, "targetRestSec", value)
    }

    const addNewExerciseBlock = () => {
        if (!draft) return
        const newId = `block_${Date.now()}`
        const newBlock: RoutineBlock = {
            order: draft.routineBlocks.length + 1,
            exerciseId: newId,
            exerciseName: "",
            exerciseRationale: "",
            prescription: [{ setIndex: 1, setType: "working", targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 }],
        }
        setDraft({ ...draft, routineBlocks: [...draft.routineBlocks, newBlock] })
        setSwapBlockId(newId)
        setSwapQuery("")
    }

    // ── 3. Exercise replacement with recent-record auto-fill (all sets) ──────
    const replaceExercise = async (blockId: string, item: ExerciseCatalogItem) => {
        if (!draft) return
        setSwapLoading(true)
        try {
            const currentBlock = draft.routineBlocks.find((b) => b.exerciseId === blockId)
            if (!currentBlock) return

            const baseBlock: RoutineBlock = {
                ...currentBlock,
                exerciseId: item.id,
                exerciseName: item.nameKr,
                exerciseRationale: `${item.primaryMuscle} 주 자극 운동 (${item.equipment})`,
            }
            const enrichedBlock = await applyWeightToAllSets(baseBlock, item.id)

            setDraft((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    routineBlocks: prev.routineBlocks.map((b) => (b.exerciseId !== blockId ? b : enrichedBlock)),
                }
            })
        } finally {
            setSwapBlockId(null)
            setSwapQuery("")
            setSwapLoading(false)
        }
    }

    // ── Derived state ───────────────────────────────────────────────────────

    const totalTime = useMemo(() => {
        if (!draft || !initialDraftRef.current) return 0
        const isModified = JSON.stringify(draft.routineBlocks) !== JSON.stringify(initialDraftRef.current.routineBlocks)
        if (!isModified) return initialDraftRef.current.totalEstimatedTime
        return draft.routineBlocks.reduce((acc, block) => {
            const totalRestSec = block.prescription.reduce((s, p) => s + p.targetRestSec, 0)
            return acc + Math.ceil((block.prescription.length * 60 + totalRestSec) / 60)
        }, 0)
    }, [draft])

    // ── Validation: gate finalize when any set violates bounds ─────────────────
    const isRoutineValid = useMemo(() => {
        if (!draft) return false
        return draft.routineBlocks.every(
            (block) =>
                block.prescription.length > 0 &&
                block.prescription.every(
                    (s) =>
                        s.targetReps >= 1 &&
                        s.targetReps <= 100 &&
                        (s.targetWeightKg === null || s.targetWeightKg > 0) &&
                        s.targetRestSec >= 0 &&
                        s.targetRestSec <= 300
                )
        )
    }, [draft])

    const swapBlock = useMemo(
        () => (swapBlockId && draft ? (draft.routineBlocks.find((b) => b.exerciseId === swapBlockId) ?? null) : null),
        [swapBlockId, draft]
    )

    const aiCandidates = useMemo(() => {
        if (!swapBlock?.substitutionCandidates?.length) return []
        const candidateIds = new Set(swapBlock.substitutionCandidates.map((c) => c.exerciseId))
        return (Array.isArray(catalog) ? catalog : []).filter((item) => candidateIds.has(item.id))
    }, [swapBlock, catalog])

    const filteredCatalog = useMemo(
        () =>
            // catalog가 진짜 배열(Array)일 때만 filter를 돌리고, 아니면 빈 배열([])을 반환합니다.
            (Array.isArray(catalog) ? catalog : []).filter(
                (item) =>
                    item.nameKr?.includes(swapQuery) ||
                    item.nameEn?.toLowerCase().includes(swapQuery.toLowerCase()) ||
                    item.primaryMuscle.includes(swapQuery)
            ),
        [catalog, swapQuery]
    )

    // ── 4. Hidden Finalize: save draft → call finalize API → navigate to player
    const handleFinalize = async () => {
        if (!draft || finalizeStatus === "loading") return
        setFinalizeStatus("loading")

        localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))

        const userEditSummary = generateEditSummary(
            initialDraftRef.current?.routineBlocks ?? [],
            draft.routineBlocks
        )
        const acceptedWithoutEdits = userEditSummary.length === 0

        const payload = {
            targetWorkoutDate: new Date().toISOString().split("T")[0],
            finalRoutinePayload: { routineBlocks: draft.routineBlocks },
            acceptedWithoutEdits,
            userEditSummary,
        }

        try {
            const finalId = await routineApiClient.finalize(draft.routineDraftId, payload)
            if (finalId) localStorage.setItem("fitcore_routine_final_id", finalId)
            setFinalizeStatus("finalized")
        } catch (err) {
            console.error("[draft] finalize failed — navigating without finalId:", err)
            localStorage.removeItem("fitcore_routine_final_id")
            setFinalizeStatus("failed")
        }

        router.push("/ai_routine/player")
    }

    if (finalizeStatus === "loading" && !draft) return <div className="p-10 text-center text-slate-500">루틴을 불러오는 중...</div>
    if (!draft) return <div className="p-10 text-center text-slate-500">저장된 루틴이 없습니다.</div>

    return (
        <div className="flex flex-col w-full">
            {/* ── Fallback warning banner (sticky, 헤더 바로 아래 고정) ── */}
            {draft.isFallback && (
                <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-amber-400 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-amber-900 shrink-0" />
                    <p className="text-sm font-bold text-amber-900">AI 생성에 실패하여 기본 추천 루틴을 제공합니다.</p>
                </div>
            )}

        <div className="flex flex-col w-full max-w-2xl mx-auto p-4 space-y-6 pb-44">

            {/* ── Status badge + estimated time ── */}
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
                            {draft.isFallback ? "대체 루틴 (AI 연결 지연)" : "AI 추천 루틴"}
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-mono">{draft.statusReasonCode}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* kg / lbs 단위 토글 */}
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

            {/* ── Routine summary card (title + rationale) ── */}
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

            {/* ── Exercise block list ── */}
            <section className="space-y-4">
                {draft.routineBlocks.map((block) => (
                    <ExerciseCard
                        key={block.exerciseId}
                        block={block}
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

                <button
                    onClick={addNewExerciseBlock}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 font-bold hover:bg-slate-50 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> 새로운 운동 추가
                </button>
            </section>

            {/* ── Bottom action bar ── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {!isRoutineValid && (
                    <p className="text-center text-xs text-red-500 font-bold mb-2">
                        입력값을 확인해 주세요 (횟수 1–100, 무게 0 초과, 휴식 0–300초)
                    </p>
                )}
                <button
                    onClick={handleFinalize}
                    disabled={finalizeStatus === "loading" || !isRoutineValid}
                    className="w-full max-w-2xl mx-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] block"
                >
                    <Save className="w-5 h-5" /> {finalizeStatus === "loading" ? "준비 중..." : "운동 시작"}
                </button>
            </div>

            {/* ── Exercise swap modal ── */}
            {swapBlockId && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                            <h3 className="font-bold text-slate-800 text-base">운동 교체</h3>
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
                                    최근 기록을 불러오는 중...
                                </div>
                            ) : (
                                <>
                                    {/* AI 추천 대체 운동 섹션 */}
                                    {aiCandidates.length > 0 && (
                                        <div>
                                            <p className="px-5 pt-4 pb-2 text-[10px] font-black text-purple-500 uppercase tracking-widest">
                                                ✦ AI 추천 대체 운동
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

                                    {/* 전체 운동 검색 리스트 */}
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

// ── ExerciseCard ─────────────────────────────────────────────────────────────

interface ExerciseCardProps {
    block: RoutineBlock
    displayUnit: "kg" | "lbs"
    onUpdateSet: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRestTime: (blockId: string, arrayIndex: number, value: number) => void
    onAddSet: (blockId: string) => void
    onDeleteSet: (blockId: string, arrayIndex: number) => void
    onDeleteBlock: (blockId: string) => void
    onSwapRequest: (blockId: string) => void
}

function ExerciseCard({
    block,
    displayUnit,
    onUpdateSet,
    onUpdateRestTime,
    onAddSet,
    onDeleteSet,
    onDeleteBlock,
    onSwapRequest,
}: ExerciseCardProps) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
            <button
                onClick={() => onDeleteBlock(block.exerciseId)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
            >
                <Trash2 className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-slate-800 pr-10 truncate">
                {block.exerciseName || <span className="text-slate-300 font-medium">운동 선택 필요</span>}
            </h4>
            {block.exerciseRationale && (
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed line-clamp-2">{block.exerciseRationale}</p>
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
                        blockId={block.exerciseId}
                        displayUnit={displayUnit}
                        onUpdate={onUpdateSet}
                        onUpdateRest={onUpdateRestTime}
                        onDelete={onDeleteSet}
                        isOnly={block.prescription.length === 1}
                    />
                ))}
            </div>

            <button
                onClick={() => onAddSet(block.exerciseId)}
                className="w-full mt-3 py-2 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400 font-bold hover:bg-slate-50 hover:border-blue-200 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
            >
                <Plus className="w-3.5 h-3.5" /> 세트 추가
            </button>

            <button
                onClick={() => onSwapRequest(block.exerciseId)}
                className="w-full mt-2 py-2 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400 font-bold hover:bg-slate-50 hover:border-purple-200 hover:text-purple-500 transition-colors"
            >
                다른 운동으로 교체하기
            </button>
        </div>
    )
}

// ── SetRow ───────────────────────────────────────────────────────────────────

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

function SetRow({ set, arrayIndex, blockId, displayUnit, onUpdate, onUpdateRest, onDelete, isOnly }: SetRowProps) {
    // View: kg(Model) → 화면 표시값. Model은 항상 kg로만 유지.
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
        if (!isNaN(num) && num > 0) {
            // lbs 입력 → kg으로 역산하여 Model에 저장
            const kg = displayUnit === "lbs" ? Math.round(num / 2.20462) : num
            onUpdate(blockId, arrayIndex, "targetWeightKg", kg)
        }
    }

    const handleRepsChange = (raw: string) => {
        const num = parseInt(raw)
        if (!isNaN(num) && num >= 1 && num <= 100) onUpdate(blockId, arrayIndex, "targetReps", num)
    }

    const handleRestStep = (delta: number) => {
        const next = Math.min(300, Math.max(0, set.targetRestSec + delta))
        onUpdateRest(blockId, arrayIndex, next)
    }

    return (
        <div className="grid grid-cols-[1.25rem_1fr_1fr_3rem_1.25rem] gap-x-1.5 items-center">
            <span className="text-xs font-black text-slate-500 text-center">{arrayIndex + 1}</span>

            <input
                type="number"
                min={displayUnit === "lbs" ? 1 : 0.5}
                step={displayUnit === "lbs" ? 1 : 0.5}
                value={weightDisplay}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="BW"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-2 text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />

            <input
                type="number"
                min={1}
                step={1}
                value={set.targetReps}
                onChange={(e) => handleRepsChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-2 text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />

            <div className="flex flex-col items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => handleRestStep(30)}
                    className="w-full text-[9px] font-bold text-slate-400 hover:text-blue-500 leading-none py-0.5 hover:bg-blue-50 rounded transition-colors"
                >
                    ＋
                </button>
                <span className="text-[10px] font-black text-slate-600 tabular-nums leading-none">
                    {set.targetRestSec}s
                </span>
                <button
                    type="button"
                    onClick={() => handleRestStep(-30)}
                    disabled={set.targetRestSec <= 0}
                    className="w-full text-[9px] font-bold text-slate-400 hover:text-blue-500 leading-none py-0.5 hover:bg-blue-50 rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    －
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
