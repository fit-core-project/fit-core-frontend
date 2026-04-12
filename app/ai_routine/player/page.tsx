"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, Timer, X, Play, Flame, Trophy, Dumbbell } from "lucide-react"

// --- 타입 정의 ---
interface Exercise {
    exercise_name: string
    target_weight: number | null
    sets: number
    reps: number
    rest_time_sec: number
    coach_tip: string
}

interface RoutineData {
    exercises: Exercise[]
    total_estimated_time: number
    overall_feedback: string
}

export default function WorkoutPlayer() {
    const router = useRouter()

    // 상태 관리
    const [routine, setRoutine] = useState<RoutineData | null>(null)
    const [checkedSets, setCheckedSets] = useState<Set<string>>(new Set()) // '운동인덱스-세트인덱스' 형태로 저장

    // 타이머 상태
    const [isTimerActive, setIsTimerActive] = useState(false)
    const [timeLeft, setTimeLeft] = useState(0)

    // 화면 전환 상태
    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // 1. 컴포넌트 마운트 시 로컬 스토리지에서 루틴 데이터 불러오기
    useEffect(() => {
        const savedRoutine = localStorage.getItem("fitcore_active_routine")
        if (savedRoutine) {
            setRoutine(JSON.parse(savedRoutine))
        } else {
            // 데이터가 없으면 다시 생성 페이지로 쫓아냄
            alert("활성화된 루틴이 없습니다.")
            router.push("/ai_routine")
        }
    }, [router])

    // 2. 타이머 카운트다운 로직
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1)
            }, 1000)
        } else if (timeLeft === 0 && isTimerActive) {
            // 타이머 종료
            setIsTimerActive(false)
            // TODO: 띠링~ 하는 완료 효과음 재생 (웹 오디오 API)
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

    // 전체 세트 수 및 진행률 계산
    const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets, 0)
    const progressPercent = Math.round((checkedSets.size / totalSets) * 100)

    // --- 핸들러 함수 ---
    const handleCheckSet = (exIndex: number, setIndex: number, restTime: number) => {
        const key = `${exIndex}-${setIndex}`
        const newChecked = new Set(checkedSets)

        if (newChecked.has(key)) {
            // 이미 체크된 걸 푸는 경우 (실수 방지)
            newChecked.delete(key)
            setCheckedSets(newChecked)
        } else {
            // 새로 체크하는 경우
            newChecked.add(key)
            setCheckedSets(newChecked)

            // 모든 세트를 다 했는지 검사
            if (newChecked.size === totalSets) {
                setIsTimerActive(false)
                setIsWorkoutComplete(true) // 🌟 운동 완료! RPE 화면으로 전환
            } else {
                // 아직 남았으면 타이머 시작
                setTimeLeft(restTime)
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
        setIsSaving(true)

        // 🌟 여기서 백엔드로 데이터를 전송합니다!
        const workoutLog = {
            routine_data: routine,
            completed_sets: checkedSets.size,
            rpe_score: rpeScore, // 1: 너무 쉬움, 2: 적당함, 3: 죽을 것 같음
            timestamp: new Date().toISOString(),
        }

        console.log("백엔드에 저장할 운동 일지:", workoutLog)

        // API 호출 흉내 (1초 대기)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 데이터 초기화 및 홈으로 이동
        localStorage.removeItem("fitcore_active_routine")
        localStorage.removeItem("fitcore_doms_data")
        alert("오늘의 운동 기록이 성공적으로 저장되었습니다! 🎉")
        router.push("/ai_routine")
    }

    // ==========================================
    // VIEW 2: 운동 완료 화면 (RPE 수집)
    // ==========================================
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

    return (
        <main className="min-h-screen bg-slate-50 pb-32">
            {/* 🌟 상단 고정: 프로그레스 바 */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
                <div className="flex justify-between items-end mb-2 max-w-2xl mx-auto w-full">
                    <div>
                        <h1 className="font-extrabold text-xl text-slate-900 flex items-center">
                            <Flame className="w-5 h-5 text-orange-500 mr-2" />
                            오늘의 루틴
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

            {/* 🌟 운동 리스트 영역 */}
            <div className="p-4 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {routine.exercises.map((ex, exIndex) => (
                    <div
                        key={exIndex}
                        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                        {/* 헤더 */}
                        <div className="p-5 border-b border-gray-50 bg-slate-900 text-white">
                            <h2 className="text-xl font-bold flex items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm mr-3">
                                    {exIndex + 1}
                                </span>
                                {ex.exercise_name}
                            </h2>
                            <p className="text-slate-400 text-sm mt-2 ml-11">💡 {ex.coach_tip}</p>
                        </div>

                        {/* 세트 리스트 */}
                        <div className="p-2">
                            {Array.from({ length: ex.sets }).map((_, setIndex) => {
                                const isChecked = checkedSets.has(`${exIndex}-${setIndex}`)
                                return (
                                    <div
                                        key={setIndex}
                                        className={`flex items-center justify-between p-4 my-1 rounded-2xl transition-all ${
                                            isChecked ? "bg-blue-50/50 opacity-60" : "hover:bg-gray-50"
                                        }`}
                                    >
                                        {/* 세트 정보 */}
                                        <div className="flex items-center space-x-6">
                                            <div
                                                className={`font-bold w-12 text-center ${isChecked ? "text-blue-400" : "text-slate-400"}`}
                                            >
                                                {setIndex + 1} Set
                                            </div>
                                            <div className="font-extrabold text-xl w-20 text-slate-800">
                                                {ex.target_weight ? `${ex.target_weight}kg` : "맨몸"}
                                            </div>
                                            <div className="font-bold text-lg text-slate-600 w-16">{ex.reps}회</div>
                                        </div>

                                        {/* 🌟 완료 체크 버튼 */}
                                        <button
                                            onClick={() => handleCheckSet(exIndex, setIndex, ex.rest_time_sec)}
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

            {/* 🌟 하단 고정: 쉬는 시간 타이머 오버레이 */}
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
