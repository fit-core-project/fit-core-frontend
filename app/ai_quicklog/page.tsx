"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mic, NotebookPen, Save, Send, StopCircle, Utensils, X } from "lucide-react"
import { toast } from "sonner"
import AxiosController from "@/lib/axios/AxiosController"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import type { DietLogRequest } from "@/types/project"
import { mealLabel } from "@/utils/displayLabels"
import { Button, cx, EmptyState, Notice, Section, Surface, Tag } from "@/components/ui"

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
    "음식을 하나씩 나누고 있어요",
    "식품 DB에서 영양 성분을 찾고 있어요",
    "칼로리와 탄단지를 계산하고 있어요",
    "끼니와 시간을 정리하고 있어요",
]

const EXAMPLE_INPUTS = ["점심에 제육볶음 한 그릇", "아침 계란 두 개랑 바나나", "저녁 닭가슴살 샐러드"]

function getKstDate(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function SourceTag({ source }: { source?: "db" | "ai" | "manual" | null }) {
    if (source === "db") return <Tag>식품 DB</Tag>
    if (source === "manual") return <Tag>직접 입력</Tag>
    return <Tag>AI 추정</Tag>
}

/** Same meter as the home diet card, ink fill. */
function Meter({ value, label }: { value: number; label: string }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-hairline" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
            <div className="h-full rounded-full bg-ink" style={{ width: `${value}%` }} />
        </div>
    )
}

function mealTypeLabel(mealType: string | null | undefined): string {
    return mealType ? mealLabel(mealType) : ""
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
    const router = useRouter()
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
                        setError(data.message ?? "지금은 음성 인식을 쓸 수 없어요. 글로 적어 주세요.")
                    } else if (data.text) {
                        setInputText((prev) => (prev ? `${prev} ${data.text}` : data.text))
                    }
                } catch {
                    setError("음성을 알아듣지 못했어요. 다시 말하거나 글로 적어 주세요.")
                } finally {
                    setIsSttLoading(false)
                    stream.getTracks().forEach((track) => track.stop())
                }
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch {
            setError("마이크 권한이 없어요. 브라우저 설정에서 마이크를 허용하거나 글로 적어 주세요.")
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
                    ? "AI 서버가 바빠요. 잠시 후 다시 보내 주세요."
                    : e.response?.data?.detail ?? e.message ?? "분석하지 못했어요. 잠시 후 다시 보내 주세요."
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveLog = async () => {
        if (!parsedData?.items.length) {
            toast.info("저장할 음식이 없어요.")
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
            toast.warning(`${names}의 영양 정보를 추정하지 못해 저장하지 않았어요. 영양 화면에서 직접 기록해 주세요.`, {
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
                    `${saveable.length}건을 저장했어요. ${names}은(는) 영양 정보가 없어 빠졌어요. 직접 기록해 주세요.`,
                    { duration: 7000 },
                )
            } else {
                toast.success("식단을 저장했어요.", {
                    action: {
                        label: "영양 화면 보기",
                        onClick: () => router.push("/nutrition"),
                    },
                })
            }
            setParsedData(null)
            setInputText("")
        } catch {
            toast.error("저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
        } finally {
            setIsSaving(false)
        }
    }

    const totalProtein = parsedData?.items.reduce((acc, item) => acc + (item.protein_g ?? 0), 0) ?? 0
    const canSend = !isLoading && inputText.length > 0 && !isRecording && !isSttLoading
    const showExamples = !parsedData && !isLoading && inputText.length === 0

    return (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-ground">
            {/* 헤더 */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-ink">
                        <NotebookPen className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-title-sm font-bold text-ink">말로 식단 기록</h1>
                        <p className="text-body-sm text-ink-2">먹은 음식을 문장으로 적으면 나눠서 정리해요</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => router.push("/nutrition")}
                    aria-label="영양 화면으로 돌아가기"
                    className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                >
                    <X className="size-5" aria-hidden />
                </button>
            </header>

            {/* 콘텐츠 */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                {error && (
                    <Notice tone="danger" title="분석하지 못했어요">
                        {error}
                    </Notice>
                )}

                {!parsedData && !isLoading && !error && (
                    <EmptyState
                        className="my-auto"
                        icon={<Utensils aria-hidden />}
                        title="오늘 먹은 음식을 적어 주세요"
                        body="끼니와 양을 함께 적으면 더 정확하게 나눠요."
                    />
                )}

                {isLoading && (
                    <Surface tone="sunken" className="flex items-center gap-3" aria-busy="true">
                        <Loader2 className="size-5 shrink-0 animate-spin text-ink-2 motion-reduce:animate-none" aria-hidden />
                        <p className="text-body-sm text-ink" role="status" aria-live="polite">
                            {QUICK_LOG_MESSAGES[loadingMsgIndex]}
                        </p>
                    </Surface>
                )}

                {parsedData && (
                    <div className="flex flex-col gap-4 pb-2">
                        {parsedData.status === "fallback" && (
                            <Notice title="AI 서버에 연결하지 못해 간단 분석으로 정리했어요">
                                음식 이름과 양이 맞는지 한 번 확인해 주세요.
                            </Notice>
                        )}

                        {parsedData.items.length > 0 ? (
                            <Section title="분석 결과">
                                <Surface padded={false}>
                                    <ul className="divide-y divide-hairline">
                                        {parsedData.items.map((item, idx) => {
                                            const noMacro = item.protein_g == null && item.carbs_g == null && item.fat_g == null
                                            const meta = [
                                                item.amount != null && item.unit ? `${item.amount}${item.unit}` : null,
                                                mealTypeLabel(item.meal_type) || null,
                                                item.time_of_day || null,
                                            ].filter(Boolean)
                                            return (
                                                <li key={idx} className="flex items-start justify-between gap-3 px-4 py-3">
                                                    <div className="flex min-w-0 flex-col gap-0.5">
                                                        <span className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-body-sm font-bold text-ink">{item.food_name}</span>
                                                            <SourceTag source={item.source} />
                                                        </span>
                                                        {meta.length > 0 && <span className="text-caption tabular-nums text-ink-2">{meta.join(" · ")}</span>}
                                                    </div>
                                                    {noMacro ? (
                                                        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                                                            <Tag tone="danger">영양 정보 없음</Tag>
                                                            <span className="text-caption text-ink-2">저장에서 빠져요</span>
                                                        </div>
                                                    ) : (
                                                        <span className="shrink-0 text-right text-caption tabular-nums text-ink">
                                                            탄 {item.carbs_g ?? "?"}g · 단 {item.protein_g ?? "?"}g · 지 {item.fat_g ?? "?"}g
                                                        </span>
                                                    )}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                    {totalProtein > 0 && (
                                        <div className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
                                            <p className="flex items-baseline justify-between gap-2">
                                                <span className="text-caption text-ink-2">단백질 합계</span>
                                                <span className="text-body-sm font-bold tabular-nums text-ink">
                                                    {Math.round(totalProtein * 10) / 10}g
                                                    <span className="ml-1 font-normal text-ink-2">/ 권장 120g</span>
                                                </span>
                                            </p>
                                            <Meter label="권장 단백질 대비" value={Math.min((totalProtein / 120) * 100, 100)} />
                                        </div>
                                    )}
                                </Surface>
                                {parsedData.items.some((item) => item.protein_g == null && item.carbs_g == null && item.fat_g == null) && (
                                    <p className="text-caption text-ink-2">영양 정보가 없는 음식은 영양 화면에서 직접 기록해 주세요.</p>
                                )}
                            </Section>
                        ) : (
                            <Surface>
                                <EmptyState className="py-4" title="인식한 음식이 없어요" body="음식 이름을 더 구체적으로 적어 주세요." />
                            </Surface>
                        )}

                        <Button
                            variant="primary"
                            size="lg"
                            block
                            loading={isSaving}
                            icon={<Save className="size-5" aria-hidden />}
                            onClick={handleSaveLog}
                            disabled={!parsedData.items.length}
                        >
                            식단 저장
                        </Button>
                    </div>
                )}
            </div>

            {/* 하단 입력 */}
            <div className="shrink-0 border-t border-hairline bg-ground px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                {showExamples && (
                    <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {EXAMPLE_INPUTS.map((example) => (
                            <button
                                key={example}
                                type="button"
                                onClick={() => setInputText(example)}
                                className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-rail bg-ground px-3.5 text-body-sm text-ink hover:border-ink-3"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSttLoading || isLoading}
                        aria-label={isRecording ? "녹음 멈추기" : "음성으로 입력"}
                        aria-pressed={isRecording}
                        className={cx(
                            "inline-flex size-11 shrink-0 items-center justify-center rounded-control border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
                            isRecording ? "border-danger bg-danger-bg text-danger-ink" : "border-rail bg-ground text-ink hover:bg-surface",
                        )}
                    >
                        {isRecording ? <StopCircle className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
                    </button>

                    <label htmlFor="quicklog-input" className="sr-only">
                        먹은 음식
                    </label>
                    <textarea
                        id="quicklog-input"
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
                        placeholder={isSttLoading ? "음성을 글자로 바꾸는 중" : "먹은 음식을 적어 주세요"}
                        disabled={isSttLoading || isLoading || isRecording}
                        rows={1}
                        className="field-sizing-content min-h-11 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-control border border-rail bg-ground px-3 py-2.5 text-body leading-6 text-ink [scrollbar-width:thin] placeholder:text-ink-2 hover:border-ink-3 focus:border-ink focus:outline-none disabled:bg-surface"
                    />

                    <button
                        type="button"
                        onClick={handleParse}
                        disabled={!canSend}
                        aria-label="분석 보내기"
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-control bg-ink text-white transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-rail"
                    >
                        <Send className="size-5" aria-hidden />
                    </button>
                </div>

                {(isRecording || isSttLoading) && (
                    <p className="mt-2 text-center text-caption text-ink-2" role="status">
                        {isRecording ? "듣고 있어요. 다 말했으면 멈춤 버튼을 누르세요." : "음성을 글자로 바꾸고 있어요."}
                    </p>
                )}
            </div>
        </div>
    )
}
