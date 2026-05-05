"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, Trash2, Plus, Save, X, Info, Search } from "lucide-react"
import { RoutineDraft, RoutineBlock, SetPrescription } from "@/types/routine"
import { getExerciseCatalog, getRecentRecord } from "@/services/exerciseService"
import { ExerciseCatalogItem } from "@/services/mockDataFactory"
import routineApiClient from "@/lib/api/routine/routineApiClient"

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
    const [loading, setLoading] = useState(true)
    const [isFinalizing, setIsFinalizing] = useState(false)
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
                setLoading(false)
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
                          targetReps: 10,
                          targetWeightKg: null,
                          targetRir: 2,
                          targetRestSec: 60,
                      }
                const updated = [...block.prescription, newSet]
                return { ...block, prescription: updated.map((s, i) => ({ ...s, setIndex: i })) }
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
                return { ...block, prescription: updated.map((s, i) => ({ ...s, setIndex: i })) }
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
            exerciseId: newId,
            exerciseName: "",
            exerciseRationale: "",
            prescription: [{ setIndex: 0, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 }],
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
    }, [draft?.routineBlocks])

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
        if (!draft || isFinalizing) return
        setIsFinalizing(true)

        localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))

        const acceptedWithoutEdits =
            JSON.stringify(draft.routineBlocks) === JSON.stringify(initialDraftRef.current?.routineBlocks)

        // Golden 계약 기준 payload 조립:
        // - finalRoutinePayload: 전체 draft가 아닌 { routineBlocks } clean payload
        // - userEditSummary: string[] (수정 없으면 빈 배열, diff 로직은 추후 구현)
        // - acceptedWithoutEdits: userEditSummary.length === 0 과 동일
        const payload = {
            targetWorkoutDate: new Date().toISOString().split("T")[0],
            finalRoutinePayload: { routineBlocks: draft.routineBlocks },
            acceptedWithoutEdits,
            userEditSummary: [] as string[],
        }

        try {
            const finalId = await routineApiClient.finalize(draft.routineDraftId, payload)
            if (finalId) localStorage.setItem("fitcore_routine_final_id", finalId)
        } catch (err) {
            console.error("[draft] finalize failed — navigating without finalId:", err)
            localStorage.removeItem("fitcore_routine_final_id")
        }

        router.push("/ai_routine/player")
    }

    if (loading) return <div className="p-10 text-center text-slate-500">루틴을 불러오는 중...</div>
    if (!draft) return <div className="p-10 text-center text-slate-500">저장된 루틴이 없습니다.</div>

    return (
        <div className="flex flex-col w-full max-w-2xl mx-auto p-4 space-y-6 pb-32">
            {/* ── Fallback warning badge ── */}
            {draft.isFallback && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm font-bold text-amber-800">AI 연결 지연으로 기본 루틴을 제공합니다</p>
                </div>
            )}

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
                <span className="text-blue-600 font-bold flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {totalTime}분
                </span>
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
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100">
                <button
                    onClick={handleFinalize}
                    disabled={isFinalizing}
                    className="w-full max-w-2xl mx-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] block"
                >
                    <Save className="w-5 h-5" /> {isFinalizing ? "준비 중..." : "운동 시작"}
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
                            ) : filteredCatalog.length === 0 ? (
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── ExerciseCard ─────────────────────────────────────────────────────────────

const REST_OPTIONS = [30, 60, 90, 120, 150, 180]

interface ExerciseCardProps {
    block: RoutineBlock
    onUpdateSet: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRestTime: (blockId: string, arrayIndex: number, value: number) => void
    onAddSet: (blockId: string) => void
    onDeleteSet: (blockId: string, arrayIndex: number) => void
    onDeleteBlock: (blockId: string) => void
    onSwapRequest: (blockId: string) => void
}

function ExerciseCard({
    block,
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

            <h4 className="font-bold text-slate-800 pr-10">
                {block.exerciseName || <span className="text-slate-300 font-medium">운동 선택 필요</span>}
            </h4>
            {block.exerciseRationale && (
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">{block.exerciseRationale}</p>
            )}

            {/* Set table header */}
            <div className="grid grid-cols-[1.5rem_1fr_1fr_3.5rem_1.5rem] gap-x-2 mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">SET</span>
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">KG</span>
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">REPS</span>
                <span className="text-[10px] font-black text-slate-400 uppercase text-center">REST</span>
                <span />
            </div>

            {/* Set rows */}
            <div className="space-y-2">
                {block.prescription.map((set, arrayIndex) => (
                    <SetRow
                        key={arrayIndex}
                        set={set}
                        arrayIndex={arrayIndex}
                        blockId={block.exerciseId}
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
    onUpdate: (blockId: string, arrayIndex: number, field: keyof SetPrescription, value: number | null) => void
    onUpdateRest: (blockId: string, arrayIndex: number, value: number) => void
    onDelete: (blockId: string, arrayIndex: number) => void
    isOnly: boolean
}

function SetRow({ set, arrayIndex, blockId, onUpdate, onUpdateRest, onDelete, isOnly }: SetRowProps) {
    const weightDisplay = set.targetWeightKg === null ? "" : String(set.targetWeightKg)

    const handleWeightChange = (raw: string) => {
        if (raw === "") {
            onUpdate(blockId, arrayIndex, "targetWeightKg", null)
            return
        }
        const num = parseFloat(raw)
        if (!isNaN(num) && num >= 0) onUpdate(blockId, arrayIndex, "targetWeightKg", num)
    }

    const handleRepsChange = (raw: string) => {
        const num = parseInt(raw)
        if (!isNaN(num) && num >= 1) onUpdate(blockId, arrayIndex, "targetReps", num)
    }

    const handleRestStep = (delta: number) => {
        const next = Math.max(0, set.targetRestSec + delta)
        onUpdateRest(blockId, arrayIndex, next)
    }

    return (
        <div className="grid grid-cols-[1.5rem_1fr_1fr_3.5rem_1.5rem] gap-x-2 items-center">
            <span className="text-xs font-black text-slate-500 text-center">{arrayIndex + 1}</span>

            <input
                type="number"
                min={0}
                step={0.5}
                value={weightDisplay}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="BW"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />

            <input
                type="number"
                min={1}
                step={1}
                value={set.targetReps}
                onChange={(e) => handleRepsChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
