"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, Timer, X, Play, Flame, Trophy } from "lucide-react"
import { RoutineDraft } from "@/types/routine"
import workoutApiClient, { WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"

export default function WorkoutPlayer() {
    const router = useRouter()

    const [routine, setRoutine] = useState<RoutineDraft | null>(null)
    const [routineFinalId, setRoutineFinalId] = useState<string | null>(null)
    const [checkedSets, setCheckedSets] = useState<Set<string>>(new Set()) // 'blockIndex-setIndex' 형태

    const [isTimerActive, setIsTimerActive] = useState(false)
    const [timeLeft, setTimeLeft] = useState(0)

    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveFailed, setSaveFailed] = useState(false)
    const pendingPayload = useRef<WorkoutSaveRequest | null>(null)
    const workoutStartTime = useRef<number>(Date.now())

    // 1. localStorage에서 RoutineDraft 및 routineFinalId 로드
    useEffect(() => {
        const savedRoutine = localStorage.getItem("fitcore_active_routine")
        const savedFinalId = localStorage.getItem("fitcore_routine_final_id")
        if (savedRoutine) {
            setRoutine(JSON.parse(savedRoutine) as RoutineDraft)
        } else {
            alert("활성화된 루틴이 없습니다.")
            router.push("/ai_routine")
        }
        if (savedFinalId) setRoutineFinalId(savedFinalId)
    }, [router])

    // 2. 타이머 카운트다운
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
        } else if (timeLeft === 0 && isTimerActive) {
            setIsTimerActive(false)
            // TODO: 완료 효과음 (웹 오디오 API)
        }
        return () => clearInterval(interval)
    }, [isTimerActive, timeLeft])

    if (!routine) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <span className="animate-pulse font-bold text-slate-500">루틴을 불러오는 중...</span>
            </div>
        )
    }

    // 3. 전체 세트 수 = 모든 블록의 prescription.length 합산
    const totalSets = routine.routineBlocks.reduce((acc, block) => acc + block.prescription.length, 0)
    const progressPercent = totalSets === 0 ? 0 : Math.round((checkedSets.size / totalSets) * 100)

    const handleCheckSet = (blockIndex: number, setArrayIndex: number, restSec: number) => {
        const key = `${blockIndex}-${setArrayIndex}`
        const newChecked = new Set(checkedSets)

        if (newChecked.has(key)) {
            newChecked.delete(key)
            setCheckedSets(newChecked)
        } else {
            newChecked.add(key)
            setCheckedSets(newChecked)

            if (newChecked.size === totalSets) {
                setIsTimerActive(false)
                setIsWorkoutComplete(true)
            } else {
                // 세트별 targetRestSec을 타이머에 정확히 연결
                setTimeLeft(restSec)
                setIsTimerActive(true)
            }
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, "0")}`
    }

    const handleFinishRPE = async (rpeScore: number) => {
        if (!routine) return
        setIsSaving(true)
        setSaveFailed(false)

        const workoutDate = new Date().toISOString().split("T")[0]
        const durationMin = Math.max(1, Math.round((Date.now() - workoutStartTime.current) / 60_000))

        const DOMS_LEVEL_MAP: Record<number, string> = { 1: "mild", 2: "moderate", 3: "severe" }
        const painAreas: string[] = JSON.parse(localStorage.getItem("fitcore_pain_areas") || "[]")
        const domsRaw: Record<string, number> = JSON.parse(localStorage.getItem("fitcore_doms_data") || "{}")
        const currentDoms = Object.entries(domsRaw)
            .filter(([, v]) => DOMS_LEVEL_MAP[v] !== undefined)
            .map(([bodyPart, v]) => ({ bodyPart, level: DOMS_LEVEL_MAP[v] }))

        const sets = routine.routineBlocks.flatMap((block) =>
            block.prescription.map((set, index) => ({
                exerciseId: block.exerciseId,
                exerciseNameSnapshot: block.exerciseName,
                setIndex: index + 1,
                setType: "working",
                trackingMode: "weightReps",
                weightKg: set.targetWeightKg,
                reps: set.targetReps,
                rpe: set.targetRir,
                isFailure: false,
                restSec: set.targetRestSec,
            }))
        )

        const finalWorkoutData: WorkoutSaveRequest = {
            workoutDate,
            splitLabel: routine.summaryTitle,
            sourceRoutineFinalId: routineFinalId,
            timeAvailableMin: routine.totalEstimatedTime,
            durationMin,
            readinessLevel: "normal",
            currentPainAreas: painAreas,
            currentDoms,
            unavailableEquipment: [],
            sets,
        }

        pendingPayload.current = finalWorkoutData
        await trySave(finalWorkoutData)
    }

    const trySave = async (payload: WorkoutSaveRequest) => {
        setIsSaving(true)
        setSaveFailed(false)
        try {
            await workoutApiClient.save(payload)
            // Success: clean up all session keys including any prior failure backup
            localStorage.removeItem("fitcore_active_routine")
            localStorage.removeItem("fitcore_doms_data")
            localStorage.removeItem("fitcore_pain_areas")
            localStorage.removeItem("fitcore_routine_final_id")
            localStorage.removeItem("fitcore_failed_workout_save")
            router.push("/ai_routine")
        } catch (err) {
            console.error("[player] POST /api/workouts failed:", err)
            localStorage.setItem("fitcore_failed_workout_save", JSON.stringify(payload))
            setSaveFailed(true)
        } finally {
            setIsSaving(false)
        }
    }

    const handleRetry = () => {
        if (pendingPayload.current) trySave(pendingPayload.current)
    }

    const handleSaveLater = () => {
        // Leave fitcore_failed_workout_save intact for later recovery
        localStorage.removeItem("fitcore_active_routine")
        localStorage.removeItem("fitcore_doms_data")
        localStorage.removeItem("fitcore_pain_areas")
        localStorage.removeItem("fitcore_routine_final_id")
        router.push("/ai_routine")
    }

    // ── VIEW 2b: 저장 실패 ───────────────────────────────────────────────────
    if (isWorkoutComplete && saveFailed) {
        return (
            <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
                <div className="text-5xl mb-6">⚠️</div>
                <h1 className="text-2xl font-extrabold mb-3 text-red-400">기록 저장 실패</h1>
                <p className="text-slate-400 text-center mb-2 leading-relaxed">
                    네트워크 문제로 기록 저장에 실패했습니다.
                </p>
                <p className="text-slate-500 text-sm text-center mb-10">
                    데이터는 안전하게 보관되어 있습니다.
                </p>

                <div className="w-full max-w-md space-y-3">
                    <button
                        onClick={handleRetry}
                        disabled={isSaving}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400 text-white font-bold rounded-2xl transition-colors"
                    >
                        {isSaving ? "저장 중..." : "다시 시도"}
                    </button>
                    <button
                        onClick={handleSaveLater}
                        disabled={isSaving}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold rounded-2xl transition-colors"
                    >
                        나중에 저장
                    </button>
                </div>
            </main>
        )
    }

    // ── VIEW 2: 운동 완료 (RPE 수집) ─────────────────────────────────────────
    if (isWorkoutComplete) {
        return (
            <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 animate-fade-in-up">
                <Trophy className="w-24 h-24 text-yellow-400 mb-6" />
                <h1 className="text-4xl font-extrabold mb-2">오운완!</h1>
                <p className="text-slate-400 mb-12">오늘의 AI 루틴을 완벽하게 끝냈습니다.</p>

                <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-6 text-center">오늘 루틴 강도는 어땠나요?</h2>

                    <div className="space-y-4">
                        <button
                            onClick={() => handleFinishRPE(1)}
                            disabled={isSaving}
                            className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-colors"
                        >
                            <span className="text-3xl">😊</span>
                            <span className="font-bold text-lg">너무 쉬웠어요</span>
                            <span className="text-slate-400 text-sm">볼륨 증가 필요</span>
                        </button>
                        <button
                            onClick={() => handleFinishRPE(2)}
                            disabled={isSaving}
                            className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-blue-600 rounded-2xl transition-colors ring-2 ring-blue-500"
                        >
                            <span className="text-3xl">😐</span>
                            <span className="font-bold text-lg">딱 적당했어요</span>
                            <span className="text-slate-400 text-sm">현재 강도 유지</span>
                        </button>
                        <button
                            onClick={() => handleFinishRPE(3)}
                            disabled={isSaving}
                            className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-red-600 rounded-2xl transition-colors"
                        >
                            <span className="text-3xl">🥵</span>
                            <span className="font-bold text-lg">죽을 것 같아요</span>
                            <span className="text-slate-400 text-sm">볼륨 감소 필요</span>
                        </button>
                    </div>

                    {isSaving && (
                        <p className="text-center text-blue-400 mt-6 animate-pulse">DB에 일지를 기록 중입니다...</p>
                    )}
                </div>
            </main>
        )
    }

    // ── VIEW 1: 운동 진행 화면 ────────────────────────────────────────────────
    return (
        <main className="min-h-screen bg-slate-50 pb-32">
            {/* 상단 고정: 제목 + 진행 바 */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
                <div className="flex justify-between items-end mb-2 max-w-2xl mx-auto w-full">
                    <div>
                        <h1 className="font-extrabold text-xl text-slate-900 flex items-center">
                            <Flame className="w-5 h-5 text-orange-500 mr-2" />
                            {routine.summaryTitle || "오늘의 루틴"}
                        </h1>
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                        {checkedSets.size} <span className="text-gray-400 font-normal">/ {totalSets} 세트</span>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* 운동 블록 리스트 */}
            <div className="p-4 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* 외부 루프: routineBlocks */}
                {routine.routineBlocks.map((block, blockIndex) => (
                    <div
                        key={block.exerciseId}
                        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                        {/* 카드 헤더 */}
                        <div className="p-5 border-b border-gray-50 bg-slate-900 text-white">
                            <h2 className="text-xl font-bold flex items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm mr-3 shrink-0">
                                    {blockIndex + 1}
                                </span>
                                {block.exerciseName}
                            </h2>
                            {block.exerciseRationale && (
                                <p className="text-slate-400 text-sm mt-2 ml-11 leading-relaxed">
                                    💡 {block.exerciseRationale}
                                </p>
                            )}
                        </div>

                        {/* 내부 루프: prescription 배열 직접 매핑 */}
                        <div className="p-2">
                            {block.prescription.map((set, setArrayIndex) => {
                                const isChecked = checkedSets.has(`${blockIndex}-${setArrayIndex}`)
                                return (
                                    <div
                                        key={setArrayIndex}
                                        className={`flex items-center justify-between p-4 my-1 rounded-2xl transition-all ${
                                            isChecked ? "bg-blue-50/50 opacity-60" : "hover:bg-gray-50"
                                        }`}
                                    >
                                        {/* 세트 정보: 번호 / 중량 / 횟수 */}
                                        <div className="flex items-center space-x-6">
                                            <div
                                                className={`font-bold w-12 text-center ${isChecked ? "text-blue-400" : "text-slate-400"}`}
                                            >
                                                {set.setIndex + 1} Set
                                            </div>
                                            <div className="font-extrabold text-xl w-20 text-slate-800">
                                                {set.targetWeightKg !== null ? `${set.targetWeightKg}kg` : "맨몸"}
                                            </div>
                                            <div className="font-bold text-lg text-slate-600 w-16">
                                                {set.targetReps}회
                                            </div>
                                        </div>

                                        {/* 완료 체크 — targetRestSec을 타이머에 정확히 전달 */}
                                        <button
                                            onClick={() =>
                                                handleCheckSet(blockIndex, setArrayIndex, set.targetRestSec)
                                            }
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                                isChecked
                                                    ? "bg-blue-500 text-white shadow-inner"
                                                    : "bg-gray-100 text-gray-400 border-2 border-gray-200 hover:border-blue-300"
                                            }`}
                                        >
                                            {isChecked ? (
                                                <Check className="w-6 h-6 stroke-[3]" />
                                            ) : (
                                                <Play className="w-5 h-5 ml-1" />
                                            )}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 고정: 휴식 타이머 오버레이 */}
            {isTimerActive && (
                <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-6 rounded-t-3xl shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.3)] z-50 animate-fade-in-up">
                    <div className="max-w-md mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mr-4">
                                <Timer
                                    className={`w-7 h-7 ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-blue-400"}`}
                                />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm font-bold mb-1">휴식 시간</p>
                                <div
                                    className={`text-4xl font-mono font-extrabold tracking-tighter ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}
                                >
                                    {formatTime(timeLeft)}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsTimerActive(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center transition-colors"
                        >
                            <X className="w-5 h-5 mr-2" />
                            건너뛰기
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}
