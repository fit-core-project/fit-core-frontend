"use client"

import { useState, useEffect, useRef } from "react"
import {
    Send,
    Utensils,
    Dumbbell,
    Sparkles,
    Flame,
    Droplets,
    Wheat,
    Mic,
    Bot,
    StopCircle,
    RefreshCcw,
    AlertCircle,
} from "lucide-react"

// --- TypeScript 타입 정의 ---
interface ParsedData {
    diet_logs: { food_name: string; estimated_calories: number; protein_g: number; carbs_g: number; fat_g: number }[]
    workout_logs: { exercise_name: string; weight_kg: number | null; sets: number | null; reps: number | null }[]
    overall_summary: string
}

// --- 위트 있는 로딩 메시지 목록 ---
const QUICK_LOG_MESSAGES = [
    "냉장고 속 음식들이 긴장하고 있습니다...",
    "영양 성분표를 돋보기로 분석 중입니다...",
    "오늘의 치팅을 근육으로 승화시키는 설계 중...",
    "단백질 섭취량이 부족한지 매의 눈으로 체크 중...",
    "식단 기록을 보고 트레이너가 미소 짓게 만드는 중...",
    "칼로리 소모량을 소수점까지 정밀 계산하고 있습니다...",
    "방금 먹은 음식의 매크로를 분해 중입니다...",
    "내일의 성장을 위해 일지를 정리하고 있습니다...",
]

export default function QuickLogPage() {
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<ParsedData | null>(null)

    const [isRecording, setIsRecording] = useState(false)
    const [isSttLoading, setIsSttLoading] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<BlobPart[]>([])

    const [displayedFeedback, setDisplayedFeedback] = useState("")

    // 로딩 메시지 순환 효과
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingMsgIndex((prev) => (prev + 1) % QUICK_LOG_MESSAGES.length)
            }, 2000)
        } else {
            setLoadingMsgIndex(0)
        }
        return () => clearInterval(interval)
    }, [isLoading])

    // ==========================================
    // 🎙️ 오디오 녹음 및 Whisper STT 전송
    // ==========================================
    const startRecording = async () => {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data)
            }

            mediaRecorder.onstop = async () => {
                setIsSttLoading(true)
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
                const formData = new FormData()
                formData.append("audio_file", audioBlob, "voice_record.webm")

                try {
                    const response = await fetch("http://localhost:8000/api/ai/stt", {
                        method: "POST",
                        body: formData,
                    })
                    if (!response.ok) throw new Error("STT 변환에 실패했습니다.")
                    const data = await response.json()
                    if (data.text) setInputText((prev) => (prev ? `${prev} ${data.text}` : data.text))
                } catch (err: any) {
                    setError("음성 인식 중 오류가 발생했습니다. 다시 말씀해 주세요.")
                } finally {
                    setIsSttLoading(false)
                    stream.getTracks().forEach((track) => track.stop())
                }
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            setError("마이크 권한이 필요합니다.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    // ==========================================
    // 🚀 AI 파싱 요청 (Gemini)
    // ==========================================
    const handleParse = async () => {
        if (!inputText.trim()) return
        setIsLoading(true)
        setError(null)
        setParsedData(null)
        setDisplayedFeedback("")

        try {
            const response = await fetch("http://localhost:8000/api/ai/parse-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: inputText }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                if (response.status === 503 || response.status === 500) {
                    throw new Error("AI 서버가 현재 붐비고 있습니다. 잠시 후 다시 시도해 주세요.")
                }
                throw new Error(errorData.detail || "분석 중 오류가 발생했습니다.")
            }

            const data = await response.json()
            setParsedData(data)
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    // 코치 피드백 타이핑 효과
    useEffect(() => {
        if (parsedData?.overall_summary) {
            setDisplayedFeedback("")
            let i = 0
            const text = parsedData.overall_summary
            const interval = setInterval(() => {
                setDisplayedFeedback(text.slice(0, i + 1))
                i++
                if (i >= text.length) clearInterval(interval)
            }, 40)
            return () => clearInterval(interval)
        }
    }, [parsedData])

    const totalCalories = parsedData?.diet_logs.reduce((acc, curr) => acc + curr.estimated_calories, 0) || 0

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center text-gray-800 pb-24 relative">
            {/* 🌟 로딩 오버레이 (마법 아이콘 회전) */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-11/12 text-center transform transition-all scale-100 animate-in zoom-in-95">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-50"></div>
                            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center relative z-10">
                                {/* 🌟 수정됨: 반짝이는 마법(AI) 아이콘이 천천히 회전합니다 */}
                                <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: "3s" }} />
                            </div>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">AI 영양사 분석 중</h3>
                        <p
                            key={loadingMsgIndex}
                            className="text-slate-500 font-medium h-12 flex items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            {QUICK_LOG_MESSAGES[loadingMsgIndex]}
                        </p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-2xl flex flex-col gap-6">
                {/* 1. 입력 영역 */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex items-center mb-4">
                        <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
                        <h1 className="text-xl font-bold text-gray-900">AI 퀵 로그</h1>
                    </div>

                    {/* 🚨 에러 메시지 */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start text-red-700 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold">오류가 발생했습니다</p>
                                <p className="text-xs opacity-80">{error}</p>
                            </div>
                            <button
                                onClick={handleParse}
                                className="ml-2 p-2 bg-red-100 rounded-xl hover:bg-red-200 transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="오늘 먹은 것과 운동한 걸 편하게 적거나 말씀해주세요."
                            className="w-full p-4 pr-14 bg-slate-50 border border-gray-200 rounded-2xl h-36 resize-none outline-none focus:ring-2 focus:ring-purple-500 mb-4 text-base leading-relaxed"
                        />
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isSttLoading || isLoading}
                            className={`absolute bottom-8 right-3 p-3 rounded-full shadow-sm transition-all ${
                                isRecording
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-white text-gray-400 border border-gray-200"
                            }`}
                        >
                            {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    </div>

                    <button
                        onClick={handleParse}
                        disabled={isLoading || inputText.length === 0 || isRecording || isSttLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center disabled:bg-gray-300"
                    >
                        {isLoading ? "분석 중..." : "기록 분석 및 저장"}
                    </button>

                    <div className="h-6 mt-3 text-center">
                        {isSttLoading && (
                            <p className="text-sm text-purple-500 font-medium animate-pulse">
                                Whisper AI가 텍스트로 변환 중...
                            </p>
                        )}
                    </div>
                </div>

                {/* 2. 결과 영역 */}
                {parsedData && (
                    <div className="animate-fade-in-up space-y-6 mt-2">
                        {/* 코치 아바타 UI */}
                        <div className="flex items-start space-x-4 mb-8 px-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm border border-purple-100 relative max-w-[85%]">
                                <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-b border-purple-100 transform rotate-45"></div>
                                <p className="font-medium text-slate-700 leading-relaxed break-keep">
                                    {displayedFeedback}
                                    {displayedFeedback.length < parsedData.overall_summary.length && (
                                        <span className="inline-block w-1.5 h-4 ml-1 bg-purple-400 animate-pulse align-middle"></span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* 🌟 수정됨: 좌우 배치(grid) 대신 상하 배치(flex-col)로 변경하여 식단 위, 운동 아래로 정렬 */}
                        <div className="flex flex-col gap-6">
                            {/* 식단 카드 (위) */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h2 className="flex items-center font-bold text-lg mb-4 text-orange-600">
                                    <Utensils className="w-5 h-5 mr-2" />
                                    식단
                                </h2>
                                {parsedData.diet_logs.length > 0 ? (
                                    <div className="space-y-4">
                                        {parsedData.diet_logs.map((food, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100"
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="font-bold text-gray-900">{food.food_name}</span>
                                                    <span className="font-extrabold text-orange-600">
                                                        {food.estimated_calories} kcal
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                    <div className="bg-white py-1.5 rounded-lg border border-orange-100">
                                                        <Wheat className="w-3 h-3 mx-auto text-amber-500 mb-0.5" /> 탄{" "}
                                                        {food.carbs_g}g
                                                    </div>
                                                    <div className="bg-white py-1.5 rounded-lg border border-orange-100">
                                                        <Droplets className="w-3 h-3 mx-auto text-blue-500 mb-0.5" /> 단{" "}
                                                        {food.protein_g}g
                                                    </div>
                                                    <div className="bg-white py-1.5 rounded-lg border border-orange-100">
                                                        <Flame className="w-3 h-3 mx-auto text-red-500 mb-0.5" /> 지{" "}
                                                        {food.fat_g}g
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-3 border-t font-extrabold text-gray-900 flex justify-between text-lg">
                                            <span>총 합계</span>
                                            <span>{totalCalories} kcal</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-4">
                                        입력된 식단 정보가 없습니다.
                                    </p>
                                )}
                            </div>

                            {/* 운동 카드 (아래) */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h2 className="flex items-center font-bold text-lg mb-4 text-blue-600">
                                    <Dumbbell className="w-5 h-5 mr-2" />
                                    운동
                                </h2>
                                {parsedData.workout_logs.length > 0 ? (
                                    <div className="space-y-3">
                                        {parsedData.workout_logs.map((workout, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center"
                                            >
                                                <span className="font-bold text-gray-900">{workout.exercise_name}</span>
                                                <div className="text-right text-sm font-bold text-blue-600">
                                                    <span className="bg-white px-2 py-1 rounded text-slate-700 shadow-sm border border-blue-100 mr-2">
                                                        {workout.weight_kg ? `${workout.weight_kg}kg` : "맨몸"}
                                                    </span>
                                                    {workout.sets || 1}{" "}
                                                    <span className="text-blue-300 font-normal">x</span>{" "}
                                                    {workout.reps || "?"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-4">
                                        입력된 운동 정보가 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
