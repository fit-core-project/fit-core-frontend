"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, Mic, Bot, StopCircle, AlertCircle, Activity } from "lucide-react"

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
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/stt`, {
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/parse-log`, {
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
        // 🚨 포인트 1: min-h-screen 제거 -> flex-1 w-full h-full 로 부모의 남은 영역을 꽉 채움
        // layout.tsx에 이미 <main>이 있으므로 여기는 <div>로 변경했습니다.
        <div className="flex-1 w-full h-full flex flex-col items-center px-4 py-4 md:px-8 relative">
            {/* 🌟 로딩 오버레이 (기존 코드 그대로) */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-11/12 text-center transform transition-all scale-100 animate-in zoom-in-95">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50"></div>
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center relative z-10">
                                <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: "3s" }} />
                            </div>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">AI 코치 분석 중</h3>
                        <p
                            key={loadingMsgIndex}
                            className="text-slate-500 font-medium h-12 flex items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            {QUICK_LOG_MESSAGES[loadingMsgIndex]}
                        </p>
                    </div>
                </div>
            )}

            {/* 🚨 포인트 2: h-[80vh] 제거 -> flex-1 min-h-0 추가 */}
            {/* min-h-0이 있어야 내부 스크롤이 고장나지 않고 예쁘게 작동합니다. */}
            <div className="w-full max-w-3xl flex-1 min-h-0 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                {/* 1. 헤더 영역 */}
                <div className="bg-emerald-50/50 p-5 border-b border-emerald-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md shadow-emerald-200">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold text-slate-800">AI 퀵 로그</h1>
                            <p className="text-xs text-emerald-600 font-medium">
                                자연어로 편하게 식단과 운동을 기록하세요
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. 콘텐츠 영역 (flex-1 overflow-y-auto 유지) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 flex flex-col gap-6">
                    {/* ... (이 안의 에러, 초기 화면, 파싱 결과 렌더링 영역 등 기존 코드 그대로 유지) ... */}

                    {/* 🚨 에러 메시지 */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start text-red-700 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold">오류가 발생했습니다</p>
                                <p className="text-xs opacity-80">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* 데이터가 없을 때의 초기 화면 */}
                    {!parsedData && !isLoading && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full animate-in fade-in">
                            <Bot className="w-12 h-12 mb-3 text-slate-300" />
                            <p className="text-sm font-medium">하단 입력창에 오늘 먹은 음식이나 운동을 적어주세요.</p>
                        </div>
                    )}

                    {/* 파싱 결과 렌더링 영역 */}
                    {parsedData && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-4">
                            {/* 코치 아바타 피드백 (에메랄드 테마로 변경) */}
                            <div className="flex items-start space-x-4 mb-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 relative max-w-[85%]">
                                    <p className="font-medium text-slate-700 leading-relaxed break-keep text-[15px]">
                                        {displayedFeedback}
                                        {displayedFeedback.length < parsedData.overall_summary.length && (
                                            <span className="inline-block w-1.5 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"></span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* 식단 및 운동 카드 */}
                            <div className="flex flex-col gap-6">
                                {/* ... (이하 기존 식단/운동 카드 렌더링 부분 동일) ... */}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. 하단 입력 영역 (음성 녹음 + 텍스트 입력 통합) */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    <div className="flex items-end gap-2">
                        {/* STT 마이크 버튼: h-[52px] 고정 */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isSttLoading || isLoading}
                            className={`rounded-2xl transition-all shrink-0 border h-[52px] w-[52px] flex items-center justify-center ${
                                isRecording
                                    ? "bg-red-50 text-red-500 border-red-200 animate-pulse"
                                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                        >
                            {isRecording ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        {/* 텍스트 입력 및 전송 영역 */}
                        <div className="relative flex-1">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        if (!isLoading && inputText.length > 0 && !isRecording && !isSttLoading) {
                                            handleParse()
                                        }
                                    }
                                }}
                                placeholder={isSttLoading ? "음성 인식 중..." : "오늘의 식단과 운동을 알려주세요"}
                                disabled={isSttLoading || isLoading || isRecording}
                                // 💡 block 속성을 추가해 하단 고스트 여백을 없애고, min-h-[52px]로 최소 높이를 고정합니다.
                                className="block w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-3.5 pl-4 pr-12 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none overflow-y-auto min-h-[52px] max-h-32 text-[15px] leading-relaxed"
                                rows={1}
                            />

                            {/* 💡 전송 버튼: top-2를 없애고 우측 하단(bottom-1.5)에 크기를 고정(w-10 h-10)하여 배치합니다. */}
                            <button
                                onClick={handleParse}
                                disabled={isLoading || inputText.length === 0 || isRecording || isSttLoading}
                                className="absolute right-1.5 bottom-1.5 w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl transition-colors flex items-center justify-center"
                            >
                                <Send className="w-5 h-5 ml-0.5" />
                            </button>
                        </div>
                    </div>

                    {isSttLoading && (
                        <p className="text-[11px] text-center text-emerald-500 mt-2 font-bold animate-pulse">
                            STT 엔진이 음성을 텍스트로 변환 중입니다...
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
