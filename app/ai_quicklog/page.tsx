"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mic, NotebookPen, Pencil, Save, Send, StopCircle, Trash2, Utensils, X } from "lucide-react"
import { toast } from "sonner"
import AxiosController from "@/lib/axios/AxiosController"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import { mealLabel } from "@/utils/displayLabels"
import { getKstToday } from "@/utils/date"
import { isDemoMode } from "@/utils/demoMode"
import { AI_REQUEST_TIMEOUT_MS, STT_REQUEST_TIMEOUT_MS, aiErrorMessage, micErrorMessage } from "@/utils/aiRequestError"
import { discardRecorder, stopStreamTracks } from "@/utils/mediaRecorderCleanup"
import {
    defaultMealTypeByKstHour,
    draftItemKcal,
    draftItemToRequest,
    draftTotals,
    firstInvalidDraftItem,
    hasDraftItemErrors,
    isDraftItemSaveable,
    MEAL_TYPES,
    quicklogSaveLabel,
    rejectedDietItemIndex,
    sharedMealType,
    toDraftItems,
    type ParseDietItem,
    type QuicklogDraftItem,
} from "@/utils/quicklogDraft"
import { Button, cx, EmptyState, Notice, Section, Surface, Tag, TextField, ToggleChip } from "@/components/ui"
import QuicklogItemSheet from "./QuicklogItemSheet"

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

const DEFAULT_PROTEIN_GOAL_G = 120

const QUICK_LOG_MESSAGES = [
    "음식을 하나씩 나누고 있어요",
    "식품 DB에서 영양 성분을 찾고 있어요",
    "칼로리와 탄단지를 계산하고 있어요",
    "끼니와 시간을 정리하고 있어요",
]

const EXAMPLE_INPUTS = ["점심에 제육볶음 한 그릇", "아침 계란 두 개랑 바나나", "저녁 닭가슴살 샐러드"]

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

function formatG(value: number | null): string {
    return value != null ? `${Math.round(value * 10) / 10}g` : "-"
}

export default function QuickLogPage() {
    const router = useRouter()
    const today = getKstToday()
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
    const [parseError, setParseError] = useState<string | null>(null)
    const [voiceError, setVoiceError] = useState<string | null>(null)
    const [parsedStatus, setParsedStatus] = useState<ParsedDietData["status"] | null>(null)
    /** Demo mode: the review list stays marked as a demo example, not a real analysis. */
    const [demoNotice, setDemoNotice] = useState<string | null>(null)
    const [items, setItems] = useState<QuicklogDraftItem[] | null>(null)
    const [logDate, setLogDate] = useState(today)
    const [editingKey, setEditingKey] = useState<string | null>(null)
    const [proteinGoal, setProteinGoal] = useState<number | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [isSttLoading, setIsSttLoading] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<BlobPart[]>([])
    const parseAbortRef = useRef<AbortController | null>(null)
    const sttAbortRef = useRef<AbortController | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const mountedRef = useRef(true)

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

    useEffect(() => {
        let alive = true
        nutritionTargetApiClient
            .getTarget()
            .then((target) => {
                if (alive) setProteinGoal(target?.proteinGMin && target.proteinGMin > 0 ? target.proteinGMin : null)
            })
            .catch(() => {})
        return () => {
            alive = false
        }
    }, [])

    // Leaving the page: abort in-flight AI calls and release the microphone without uploading.
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            parseAbortRef.current?.abort()
            sttAbortRef.current?.abort()
            discardRecorder(mediaRecorderRef.current)
            mediaRecorderRef.current = null
        }
    }, [])

    const startRecording = async () => {
        setVoiceError(null)
        let stream: MediaStream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (err) {
            if (mountedRef.current) setVoiceError(micErrorMessage(err))
            return
        }
        // Left the page while the permission prompt was open: don't keep the mic on.
        if (!mountedRef.current) {
            stopStreamTracks(stream)
            return
        }
        try {
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data)
            }

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop())
                setIsSttLoading(true)
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
                const formData = new FormData()
                formData.append("audio_file", audioBlob, "voice_record.webm")
                const controller = new AbortController()
                sttAbortRef.current = controller

                try {
                    const data = await AxiosController.post<SttResponse>("/api/ai/stt", formData, {
                        timeout: STT_REQUEST_TIMEOUT_MS,
                        signal: controller.signal,
                    })
                    if (data.status === "unavailable") {
                        setVoiceError("지금은 음성 인식을 쓸 수 없어요. 글로 적어 주세요.")
                    } else if (data.text) {
                        setInputText((prev) => (prev ? `${prev} ${data.text}` : data.text))
                    } else {
                        setVoiceError("말소리가 들리지 않았어요. 다시 말하거나 글로 적어 주세요.")
                    }
                } catch (err) {
                    const message = aiErrorMessage(err, "stt")
                    if (message) setVoiceError(message)
                } finally {
                    if (sttAbortRef.current === controller) sttAbortRef.current = null
                    setIsSttLoading(false)
                }
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            stream.getTracks().forEach((track) => track.stop())
            setVoiceError(micErrorMessage(err))
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const cancelStt = () => {
        sttAbortRef.current?.abort()
    }

    const handleParse = async () => {
        const text = inputText.trim()
        if (!text || isLoading) return
        const controller = new AbortController()
        parseAbortRef.current = controller
        setIsLoading(true)
        setParseError(null)
        setVoiceError(null)
        setItems(null)
        setParsedStatus(null)
        setDemoNotice(null)

        try {
            let data: ParsedDietData
            if (isDemoMode()) {
                // Demo runs without the backend: parse locally against the demo food table.
                const { demoParseDiet, demoQuicklogNotice } = await import("@/utils/demoAi")
                const demo = demoParseDiet(text)
                data = { items: demo.items }
                setDemoNotice(demoQuicklogNotice(demo))
            } else {
                data = await AxiosController.post<ParsedDietData>(
                    "/api/ai/parse-diet",
                    { text },
                    { timeout: AI_REQUEST_TIMEOUT_MS, signal: controller.signal },
                )
            }
            setItems(toDraftItems(data?.items ?? [], defaultMealTypeByKstHour()))
            setParsedStatus(data?.status ?? null)
            setLogDate(getKstToday())
        } catch (err) {
            const message = aiErrorMessage(err, "parse")
            if (message) setParseError(message)
        } finally {
            if (parseAbortRef.current === controller) parseAbortRef.current = null
            setIsLoading(false)
        }
    }

    const cancelParse = () => {
        parseAbortRef.current?.abort()
    }

    const updateItem = useCallback((key: string, next: QuicklogDraftItem) => {
        setItems((prev) => prev?.map((item) => (item.key === key ? next : item)) ?? prev)
        setEditingKey(null)
    }, [])

    const removeItem = useCallback((key: string) => {
        setItems((prev) => prev?.filter((item) => item.key !== key) ?? prev)
        setEditingKey(null)
    }, [])

    const applyMealToAll = (mealType: string) => {
        setItems((prev) => prev?.map((item) => ({ ...item, mealType })) ?? prev)
    }

    const resetReview = () => {
        setItems(null)
        setParsedStatus(null)
        setEditingKey(null)
    }

    const handleSaveLog = async () => {
        if (!items?.length) {
            toast.info("저장할 음식이 없어요.")
            return
        }
        if (quicklogSaveLabel(logDate, today).disabled) {
            toast.warning("날짜는 오늘이나 지난 날짜로 골라 주세요.")
            return
        }

        const saveable = items.filter(isDraftItemSaveable)
        const excluded = items.filter((item) => !isDraftItemSaveable(item))

        if (saveable.length === 0) {
            toast.warning("영양 정보가 있는 음식이 없어요. 음식을 눌러 탄단지나 칼로리를 적어 주세요.", { duration: 6000 })
            return
        }

        // Values above the backend bounds would fail the whole batch; open the offending row instead.
        const invalid = firstInvalidDraftItem(saveable)
        if (invalid) {
            toast.warning(`"${invalid.foodName}"의 값이 너무 커요. 고친 뒤 저장해 주세요.`, { duration: 6000 })
            setEditingKey(invalid.key)
            return
        }

        setIsSaving(true)
        try {
            await dietApiClient.save(saveable.map((item) => draftItemToRequest(item, logDate)))
            if (excluded.length > 0) {
                const names = excluded.map((i) => `"${i.foodName}"`).join(", ")
                toast.warning(`${saveable.length}건을 저장했어요. ${names}은(는) 영양 정보가 없어 빠졌어요.`, { duration: 7000 })
            } else {
                toast.success("식단을 저장했어요.", {
                    action: {
                        label: "영양 화면 보기",
                        onClick: () => router.push("/nutrition"),
                    },
                })
            }
            resetReview()
            setInputText("")
        } catch (err) {
            const index = rejectedDietItemIndex(err, saveable.length)
            const rejected = index != null ? saveable[index] : null
            if (rejected) {
                toast.error(`"${rejected.foodName}"의 값을 저장할 수 없어요. 고친 뒤 다시 저장해 주세요.`, { duration: 7000 })
                setEditingKey(rejected.key)
            } else if ((err as { response?: { status?: number } } | null)?.response?.status === 400) {
                toast.error("저장할 수 없는 값이 있어요. 음식의 양과 영양 정보를 확인해 주세요.", { duration: 7000 })
            } else {
                toast.error("저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
            }
        } finally {
            setIsSaving(false)
        }
    }

    const totals = items ? draftTotals(items) : null
    const proteinTarget = proteinGoal ?? DEFAULT_PROTEIN_GOAL_G
    const commonMeal = items ? sharedMealType(items) : null
    const editingItem = items?.find((item) => item.key === editingKey) ?? null
    const hasExcluded = items?.some((item) => !isDraftItemSaveable(item)) ?? false
    const saveButton = quicklogSaveLabel(logDate, today)
    const dateError = !logDate ? "날짜를 골라 주세요." : logDate > today ? "오늘이나 지난 날짜로 골라 주세요." : undefined
    const canSend = !isLoading && inputText.trim().length > 0 && !isRecording && !isSttLoading
    const showExamples = !items && !isLoading && inputText.length === 0

    return (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-ground">
            {editingItem && (
                <QuicklogItemSheet
                    key={editingItem.key}
                    item={editingItem}
                    onClose={() => setEditingKey(null)}
                    onSave={(next) => updateItem(editingItem.key, next)}
                    onDelete={() => removeItem(editingItem.key)}
                />
            )}

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
                {parseError && (
                    <Notice tone="danger" title="분석하지 못했어요">
                        {parseError}
                    </Notice>
                )}

                {!items && !isLoading && !parseError && (
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
                        <p className="min-w-0 flex-1 text-body-sm text-ink" role="status" aria-live="polite">
                            {QUICK_LOG_MESSAGES[loadingMsgIndex]}
                        </p>
                        <Button variant="ghost" className="-mr-2 shrink-0" onClick={cancelParse}>
                            취소
                        </Button>
                    </Surface>
                )}

                {items && (
                    <div className="flex flex-col gap-4 pb-2">
                        {demoNotice && <Notice title="데모 모드 예시 결과예요">{demoNotice}</Notice>}
                        {parsedStatus === "fallback" && (
                            <Notice title="AI 서버에 연결하지 못해 간단 분석으로 정리했어요">
                                음식 이름과 양이 맞는지 한 번 확인해 주세요.
                            </Notice>
                        )}

                        {items.length > 0 ? (
                            <Section title="저장 전 확인">
                                <p className="-mt-2 text-body-sm text-ink-2">음식을 누르면 이름·양·영양 정보를 고칠 수 있어요.</p>

                                <div className="grid grid-cols-1 gap-3">
                                    <TextField
                                        label="날짜"
                                        type="date"
                                        value={logDate}
                                        max={today}
                                        onChange={(e) => setLogDate(e.target.value)}
                                        hint="지난 날짜로도 기록할 수 있어요."
                                        error={dateError}
                                    />
                                    <fieldset className="flex flex-col gap-1.5">
                                        <legend className="mb-1.5 text-body-sm font-medium text-ink">
                                            끼니
                                            {!commonMeal && <span className="ml-1 font-normal text-ink-2">(음식마다 달라요)</span>}
                                        </legend>
                                        <div className="grid grid-cols-4 gap-2">
                                            {MEAL_TYPES.map((code) => (
                                                <ToggleChip key={code} pressed={commonMeal === code} onClick={() => applyMealToAll(code)}>
                                                    {mealLabel(code)}
                                                </ToggleChip>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>

                                <Surface padded={false}>
                                    <ul className="divide-y divide-hairline">
                                        {items.map((item) => {
                                            const kcal = draftItemKcal(item)
                                            const saveable = isDraftItemSaveable(item)
                                            const outOfRange = saveable && hasDraftItemErrors(item)
                                            const meta = [
                                                item.amount != null && item.unit ? `${item.amount}${item.unit}` : null,
                                                item.mealType ? mealLabel(item.mealType) : null,
                                                item.loggedAt,
                                            ].filter(Boolean)
                                            return (
                                                <li key={item.key} className="flex items-stretch">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingKey(item.key)}
                                                        aria-label={`${item.foodName} 수정`}
                                                        className="flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 py-3 pl-4 pr-2 text-left hover:bg-surface"
                                                    >
                                                        <span className="flex min-w-0 flex-col gap-0.5">
                                                            <span className="flex flex-wrap items-center gap-1.5">
                                                                <span className="text-body-sm font-bold text-ink">{item.foodName}</span>
                                                                <SourceTag source={item.source} />
                                                                <Pencil className="size-3.5 text-ink-2" aria-hidden />
                                                            </span>
                                                            {meta.length > 0 && <span className="text-caption tabular-nums text-ink-2">{meta.join(" · ")}</span>}
                                                            {saveable && (
                                                                <span className="text-caption tabular-nums text-ink-2">
                                                                    탄 {formatG(item.carbsG)} · 단 {formatG(item.proteinG)} · 지 {formatG(item.fatG)}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {outOfRange ? (
                                                            <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                                                                <Tag tone="danger">값이 너무 커요</Tag>
                                                                <span className="text-caption text-ink-2">눌러서 고쳐 주세요</span>
                                                            </span>
                                                        ) : saveable ? (
                                                            <span className="shrink-0 text-right text-body font-bold tabular-nums text-ink">
                                                                {kcal?.toLocaleString()}
                                                                <span className="ml-0.5 text-caption font-normal text-ink-2">kcal</span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                                                                <Tag tone="danger">영양 정보 없음</Tag>
                                                                <span className="text-caption text-ink-2">눌러서 적어 주세요</span>
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.key)}
                                                        aria-label={`${item.foodName} 빼기`}
                                                        className="inline-flex w-11 shrink-0 items-center justify-center text-ink-2 hover:bg-surface hover:text-danger-ink"
                                                    >
                                                        <Trash2 className="size-4" aria-hidden />
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                    {totals && (
                                        <div className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
                                            <p className="flex items-baseline justify-between gap-2">
                                                <span className="text-caption text-ink-2">저장할 칼로리 합계</span>
                                                <span className="text-body font-bold tabular-nums text-ink">
                                                    {totals.kcal.toLocaleString()}
                                                    <span className="ml-0.5 text-caption font-normal text-ink-2">kcal</span>
                                                </span>
                                            </p>
                                            {totals.proteinG > 0 && (
                                                <>
                                                    <p className="flex items-baseline justify-between gap-2">
                                                        <span className="text-caption text-ink-2">단백질 합계</span>
                                                        <span className="text-body-sm font-bold tabular-nums text-ink">
                                                            {totals.proteinG}g
                                                            <span className="ml-1 font-normal text-ink-2">
                                                                / {proteinGoal != null ? "목표" : "권장"} {proteinTarget}g
                                                            </span>
                                                        </span>
                                                    </p>
                                                    <Meter
                                                        label={proteinGoal != null ? "목표 단백질 대비" : "권장 단백질 대비"}
                                                        value={Math.min((totals.proteinG / proteinTarget) * 100, 100)}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </Surface>
                                {hasExcluded && (
                                    <p className="text-caption text-ink-2">영양 정보가 없는 음식은 저장에서 빠져요. 눌러서 탄단지나 칼로리를 적으면 함께 저장돼요.</p>
                                )}
                            </Section>
                        ) : (
                            <Surface>
                                <EmptyState className="py-4" title="저장할 음식이 없어요" body="문장을 다시 적어 보내거나 음식 이름을 더 구체적으로 적어 주세요." />
                            </Surface>
                        )}

                        <Button
                            variant="primary"
                            size="lg"
                            block
                            loading={isSaving}
                            icon={<Save className="size-5" aria-hidden />}
                            onClick={handleSaveLog}
                            disabled={!items.some(isDraftItemSaveable) || saveButton.disabled}
                        >
                            {saveButton.label}
                        </Button>
                    </div>
                )}
            </div>

            {/* 하단 입력 */}
            <div className="shrink-0 border-t border-hairline bg-ground px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                {voiceError && (
                    <Notice tone="danger" title="음성 입력 문제" className="mb-3">
                        {voiceError}
                    </Notice>
                )}

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
                                if (canSend) handleParse()
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
                    <div className="mt-2 flex items-center justify-center gap-2" role="status">
                        <p className="text-caption text-ink-2">
                            {isRecording ? "듣고 있어요. 다 말했으면 멈춤 버튼을 누르세요." : "음성을 글자로 바꾸고 있어요."}
                        </p>
                        {isSttLoading && (
                            <Button variant="ghost" onClick={cancelStt}>
                                취소
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
