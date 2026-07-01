"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, Mic, Bot, StopCircle, AlertCircle, Activity, Save, Apple } from "lucide-react"
import { toast } from "sonner"
import AxiosController from "@/lib/axios/AxiosController"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import type { DietLogRequest } from "@/types/project"

interface ParseDietItem {
    food_name: string
    amount?: number | null
    unit?: string | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    meal_type?: string | null
    time_of_day?: string | null
    source?: "db" | "ai" | "manual" | null
    kcal?: number | null
}

interface ParsedDietData {
    items: ParseDietItem[]
    status?: "fallback"
    fallback_reason?: string
}

interface SttResponse {
    text: string
    status?: "success" | "unavailable"
    message?: string
}

const GRAM_UNITS = new Set(["g", "gram", "grams", "그램", "그람"])

const QUICK_LOG_MESSAGES = [
    "냉장고 속 음식들이 긴장하고 있습니다...",
    "영양 성분표를 돋보기로 분석 중입니다...",
    "오늘 먹은 음식의 칼로리를 열심히 계산 중입니다...",
    "단백질 섭취량이 부족한지 매의 눈으로 체크 중...",
    "식단 기록을 보고 트레이너가 미소 짓게 만드는 중...",
    "방금 먹은 음식의 매크로를 분해 중입니다...",
]

function getKstDate(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function SourceBadge({ source }: { source?: "db" | "ai" | "manual" | null }) {
    if (source === "db")
        return <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">DB</span>
    if (source === "manual")
        return <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">직접입력</span>
    return <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">AI추정</span>
}

function mealTypeLabel(mealType: string | null | undefined): string {
    if (mealType === "breakfast") return "아침"
    if (mealType === "lunch") return "점심"
    if (mealType === "dinner") return "저녁"
    if (mealType === "snack") return "간식"
    return ""
}

function toDietLogRequests(items: ParseDietItem[]): DietLogRequest[] {
    const logDate = getKstDate()
    return items.map((item) => {
        const unitLower = (item.unit ?? "").toLowerCase()
        const isGram = GRAM_UNITS.has(unitLower)
        const amountG = isGram && item.amount != null ? item.amount : null
        const amountRaw = item.amount != null && item.unit ? `${item.amount}${item.unit}` : null
        const source = (item.source ?? "ai") as DietLogRequest["source"]
        return {
            logDate,
            mealType: item.meal_type ?? null,
            loggedAt: item.time_of_day ?? null,
            foodName: item.food_name,
            amountG,
            amountRaw,
            proteinG: item.protein_g ?? null,
            carbsG: item.carbs_g ?? null,
            fatG: item.fat_g ?? null,
            kcal: source === "db" ? (item.kcal ?? null) : null,
            source,
        }
    })
}

export default function QuickLogPage() {
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<ParsedDietData | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [isSttLoading, setIsSttLoading] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<BlobPart[]>([])
    const [isSaving, setIsSaving] = useState(false)

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
                    const data = await AxiosController.post<SttResponse>("/api/ai/stt", formData)
                    if (data.status === "unavailable") {
                        setError(data.message ?? "음성 인식 서버가 닫혀 있어 텍스트 입력을 사용해 주세요.")
                    } else if (data.text) {
                        setInputText((prev) => (prev ? `${prev} ${data.text}` : data.text))
                    }
                } catch {
                    setError("음성 인식 중 오류가 발생했습니다. 다시 말씀해 주세요.")
                } finally {
                    setIsSttLoading(false)
                    stream.getTracks().forEach((track) => track.stop())
                }
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch {
            setError("마이크 권한이 필요합니다.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const handleParse = async () => {
        if (!inputText.trim()) return
        setIsLoading(true)
        setError(null)
        setParsedData(null)

        try {
            const data = await AxiosController.post<ParsedDietData>("/api/ai/parse-diet", { text: inputText })
            setParsedData(data)
        } catch (err: unknown) {
            const e = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
            const status = e.response?.status
            const message =
                status === 503 || status === 500
                    ? "AI 서버가 현재 붐비고 있습니다. 잠시 후 다시 시도해 주세요."
                    : e.response?.data?.detail ?? e.message ?? "분석 중 오류가 발생했습니다."
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveLog = async () => {
        if (!parsedData?.items.length) {
            toast.info("저장할 식단 항목이 없습니다.")
            return
        }

        const saveable = parsedData.items.filter(
            (item) => item.protein_g != null || item.carbs_g != null || item.fat_g != null,
        )
        const excluded = parsedData.items.filter(
            (item) => item.protein_g == null && item.carbs_g == null && item.fat_g == null,
        )

        if (saveable.length === 0) {
            const names = excluded.map((i) => `"${i.food_name}"`).join(", ")
            toast.warning(`${names} 항목은 영양 정보를 추정할 수 없어 저장할 수 없습니다. 직접 입력으로 추가해 주세요.`, {
                duration: 6000,
            })
            return
        }

        setIsSaving(true)
        try {
            const requests = toDietLogRequests(saveable)
            await dietApiClient.save(requests)
            if (excluded.length > 0) {
                const names = excluded.map((i) => `"${i.food_name}"`).join(", ")
                toast.warning(
                    `${saveable.length}건 저장됨. ${names} 은(는) 영양 정보 미상으로 제외됐습니다 — 직접 입력으로 추가해 주세요.`,
                    { duration: 7000 },
                )
            } else {
                toast.success("식단이 저장되었습니다. 영양 탭에서 확인하세요.")
            }
            setParsedData(null)
            setInputText("")
        } catch {
            toast.error("저장 중 오류가 발생했습니다. 다시 시도해 주세요.")
        } finally {
            setIsSaving(false)
        }
    }

    const totalProtein = parsedData?.items.reduce((acc, item) => acc + (item.protein_g ?? 0), 0) ?? 0

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center px-4 py-4 md:px-8 relative">
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-11/12 text-center transform transition-all scale-100 animate-in zoom-in-95">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50"></div>
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center relative z-10">
                                <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: "3s" }} />
                            </div>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">AI 식단 분석 중</h3>
                        <p
                            key={loadingMsgIndex}
                            className="text-slate-500 font-medium h-12 flex items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            {QUICK_LOG_MESSAGES[loadingMsgIndex]}
                        </p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-3xl flex-1 min-h-0 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                {/* 헤더 */}
                <div className="bg-emerald-50/50 p-5 border-b border-emerald-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md shadow-emerald-200">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold text-slate-800">AI 식단 기록</h1>
                            <p className="text-xs text-emerald-600 font-medium">
                                자연어로 편하게 식단을 기록하세요
                            </p>
                        </div>
                    </div>
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 flex flex-col gap-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start text-red-700 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-bold">오류가 발생했습니다</p>
                                <p className="text-xs opacity-80">{error}</p>
                            </div>
                        </div>
                    )}

                    {!parsedData && !isLoading && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full animate-in fade-in">
                            <Bot className="w-12 h-12 mb-3 text-slate-300" />
                            <p className="text-sm font-medium">하단 입력창에 오늘 먹은 음식을 적어주세요.</p>
                        </div>
                    )}

                    {parsedData && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-4">
                            {parsedData.status === "fallback" && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start text-amber-800">
                                    <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">AI 서버가 닫혀 있어 간단 파싱으로 처리했습니다.</p>
                                        <p className="text-xs opacity-80">{parsedData.fallback_reason}</p>
                                    </div>
                                </div>
                            )}

                            {parsedData.items.length > 0 ? (
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <h2 className="flex items-center text-base font-bold text-slate-800 mb-5">
                                        <Apple className="w-5 h-5 mr-2 text-rose-500" />
                                        식단 분석
                                    </h2>
                                    <div className="space-y-4">
                                        {parsedData.items.map((item, idx) => {
                                            const noMacro =
                                                item.protein_g == null &&
                                                item.carbs_g == null &&
                                                item.fat_g == null
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex justify-between items-center p-4 rounded-2xl ${
                                                        noMacro
                                                            ? "bg-amber-50 border border-amber-100"
                                                            : "bg-slate-50"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-slate-700">{item.food_name}</span>
                                                            <SourceBadge source={item.source} />
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                            {item.amount != null && item.unit && (
                                                                <span>{item.amount}{item.unit}</span>
                                                            )}
                                                            {item.amount != null && item.unit && (item.meal_type || item.time_of_day) && " · "}
                                                            {mealTypeLabel(item.meal_type)}
                                                            {item.time_of_day ? ` · ${item.time_of_day}` : ""}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {!noMacro ? (
                                                            <div className="text-[11px] text-slate-500 font-medium">
                                                                탄 {item.carbs_g ?? "?"}g · 단 {item.protein_g ?? "?"}g · 지{" "}
                                                                {item.fat_g ?? "?"}g
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-[11px] font-semibold text-amber-600">
                                                                    영양 정보 없음
                                                                </div>
                                                                <div className="text-[10px] text-amber-500 mt-0.5">
                                                                    저장 제외 · 직접 입력 필요
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {totalProtein > 0 && (
                                        <div className="mt-6">
                                            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2">
                                                <span>단백질 섭취량</span>
                                                <span className="text-rose-500">
                                                    {Math.round(totalProtein * 10) / 10}g / 120g (권장)
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-rose-400 h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${Math.min((totalProtein / 120) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400">
                                    <p className="text-sm">인식된 식단 항목이 없습니다.</p>
                                    <p className="text-xs mt-1">음식명을 더 구체적으로 입력해 주세요.</p>
                                </div>
                            )}

                            <button
                                onClick={handleSaveLog}
                                disabled={isSaving || !parsedData.items.length}
                                className="w-full py-4 rounded-2xl font-bold flex items-center justify-center transition-all bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />내 식단 저장하기
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* 하단 입력 */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    <div className="flex items-end gap-2">
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

                        <div className="flex-1 flex items-end bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
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
                                placeholder={isSttLoading ? "음성 인식 중..." : "오늘의 식단을 알려주세요"}
                                disabled={isSttLoading || isLoading || isRecording}
                                className="w-full bg-transparent text-slate-800 py-3.5 pl-4 pr-2 outline-none resize-none overflow-y-auto min-h-[52px] max-h-32 text-[15px] leading-relaxed"
                                rows={1}
                            />

                            <button
                                onClick={handleParse}
                                disabled={isLoading || inputText.length === 0 || isRecording || isSttLoading}
                                className="shrink-0 mb-1.5 mr-1.5 w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl transition-colors flex items-center justify-center"
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
