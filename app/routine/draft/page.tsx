"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { AlertCircle, CheckCircle2, Clock, Info, Trash2, Plus, Minus, Save } from "lucide-react"
import { RoutineDraft, RoutineBlock } from "@/types/routine"
import { routineRepository } from "@/repositories/routineRepository"

export default function RoutineReviewPage() {
    const [draft, setDraft] = useState<RoutineDraft | null>(null)
    const [loading, setLoading] = useState(true)

    // ✅ 추가됨: 원본 데이터 추적을 위한 ref (수정 여부 판단용)
    const initialDraftRef = useRef<RoutineDraft | null>(null)

    useEffect(() => {
        const loadRoutine = async () => {
            // ✅ 수정됨: try/catch/finally 적용으로 API 실패 시 무한 로딩 방지
            try {
                const data = await routineRepository.generateDraft({
                    /* ...payload */
                })
                setDraft(data)
                initialDraftRef.current = JSON.parse(JSON.stringify(data)) // 깊은 복사로 원본 보관
            } catch (error) {
                console.error("루틴 로드 실패:", error)
            } finally {
                setLoading(false)
            }
        }
        loadRoutine()
    }, [])

    // 2. [수정 로직] 특정 블록의 필드 업데이트
    const updateBlock = (blockId: string, field: keyof RoutineBlock, value: any) => {
        if (!draft) return
        setDraft({
            ...draft,
            routine_blocks: draft.routine_blocks.map((block) =>
                block.id === blockId ? { ...block, [field]: value } : block
            ),
        })
    }

    // 3. [삭제 로직] 특정 블록 제거
    const deleteBlock = (blockId: string) => {
        if (!draft) return
        if (!confirm("이 운동을 루틴에서 삭제할까요?")) return
        setDraft({
            ...draft,
            routine_blocks: draft.routine_blocks.filter((block) => block.id !== blockId),
        })
    }

    // ✅ 수정됨: 초기엔 AI 제공 시간 사용, 유저가 수정하면 그때부터 직접 재계산
    const totalTime = useMemo(() => {
        if (!draft || !initialDraftRef.current) return 0

        const isModified =
            JSON.stringify(draft.routine_blocks) !== JSON.stringify(initialDraftRef.current.routine_blocks)

        if (!isModified) {
            return initialDraftRef.current.total_estimated_time // 원본 AI 시간
        }

        // 수정이 일어났을 때만 (세트 * (수행 60초 + 휴식)) 기반으로 재계산
        return draft.routine_blocks.reduce((acc, block) => {
            return acc + Math.ceil((block.sets * (60 + block.rest_time_sec)) / 60)
        }, 0)
    }, [draft?.routine_blocks])

    const handleFinalize = () => {
        if (!draft) return

        // ✅ 수정됨: 원본과 비교하여 진짜 수정되었는지 파악
        const isActuallyModified =
            JSON.stringify(draft.routine_blocks) !== JSON.stringify(initialDraftRef.current?.routine_blocks)

        const finalizePayload = {
            original_draft_id: draft.routine_draft_id,
            final_routine: draft.routine_blocks,
            total_time: totalTime,
            is_modified: isActuallyModified,
        }
        console.log("🚀 Finalize Payload 조립 완료:", finalizePayload)
        alert("루틴이 성공적으로 확정되었습니다!")
    }

    if (loading) return <div className="p-10 text-center">AI 코치가 최적의 루틴을 설계 중입니다...</div>
    if (!draft) return <div className="p-10 text-center">데이터가 없습니다.</div>

    return (
        <div className="flex flex-col w-full max-w-2xl mx-auto p-4 space-y-6 pb-32">
            {/* 상태 배지 (기획자 원칙: 숨기지 않음) */}
            <div
                className={`p-4 rounded-2xl flex items-center justify-between ${
                    draft.is_fallback ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"
                }`}
            >
                <div className="flex items-center space-x-3">
                    {draft.is_fallback ? (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm">
                            {draft.is_fallback ? "대체 루틴 (AI 연결 지연)" : "AI 추천 루틴"}
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-mono">{draft.status_reason_code}</p>
                    </div>
                </div>
                <span className="text-blue-600 font-bold flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {totalTime}분
                </span>
            </div>

            {/* 운동 리스트 (Review/Edit UI) */}
            <section className="space-y-4">
                {draft.routine_blocks.map((block) => (
                    <div
                        key={block.id}
                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group"
                    >
                        {/* 삭제 버튼 */}
                        <button
                            onClick={() => deleteBlock(block.id)}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>

                        <h4 className="font-bold text-slate-800 mb-4 pr-10">{block.exercise_name}</h4>

                        <div className="grid grid-cols-2 gap-4">
                            {/* 세트 조절 */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Sets</label>
                                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1">
                                    <button
                                        onClick={() => updateBlock(block.id, "sets", Math.max(1, block.sets - 1))}
                                        className="p-2"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold">{block.sets}</span>
                                    <button
                                        onClick={() => updateBlock(block.id, "sets", block.sets + 1)}
                                        className="p-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* 반복 횟수 조절 */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Reps</label>
                                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1">
                                    <button
                                        onClick={() => updateBlock(block.id, "reps", Math.max(1, block.reps - 1))}
                                        className="p-2"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold">{block.reps}</span>
                                    <button
                                        onClick={() => updateBlock(block.id, "reps", block.reps + 1)}
                                        className="p-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 대체 운동 교체 UI 자리 확보 (기획자 P0 오더) */}
                        <button className="w-full mt-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400 font-bold hover:bg-slate-50 transition-colors">
                            다른 운동으로 교체하기 (준비 중)
                        </button>
                    </div>
                ))}
            </section>

            {/* 최종 저장 하단 바 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100">
                <button
                    onClick={handleFinalize}
                    className="w-full max-w-2xl mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                    <Save className="w-5 h-5" />이 루틴으로 시작하기
                </button>
            </div>
        </div>
    )
}
