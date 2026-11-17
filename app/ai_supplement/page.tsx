"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ExternalLink, Loader2, Mic, Pill, RotateCcw, Send, SquarePen, StopCircle, X } from "lucide-react"
import AxiosController from "@/lib/axios/AxiosController"
import { isDemoMode } from "@/utils/demoMode"
import { demoSupplementAnswer } from "@/utils/demoSupplementAi"
import { Button, cx, Notice } from "@/components/ui"
import { AI_REQUEST_TIMEOUT_MS, STT_REQUEST_TIMEOUT_MS, aiErrorMessage, micErrorMessage } from "@/utils/aiRequestError"
import { discardRecorder, stopStreamTracks } from "@/utils/mediaRecorderCleanup"
import { restoreCanceledQuestion } from "@/utils/supplementChatInput"
import { buildSupplementHistory, resolveDemoFollowUpQuestion, WELCOME_MESSAGE_ID } from "@/utils/supplementHistory"
import {
    clearSupplementChat,
    loadSupplementChat,
    MEDICAL_DISCLAIMER,
    saveSupplementChat,
} from "@/utils/supplementChatStorage"

// --- TypeScript 타입 정의 ---
type SourceRecord = {
    id?: string
    type?: string
    source?: string
    category?: string
    docType?: string
    title?: string
    name?: string
    label?: string
    url?: string
    link?: string
    snippet?: string
    excerpt?: string
    metadata?: Record<string, unknown> | null
    [key: string]: unknown
}

type SourceDetail = SourceRecord | string

interface Message {
    id: string
    role: "user" | "ai"
    content: string
    caution?: string | null
    sources?: SourceDetail[]
    mode?: "full" | "degraded" | "fallback"
    fallbackReason?: string
    /** Error bubble only: the question to resend and the user bubble it answers. */
    retryText?: string
    retryOfId?: string
    isError?: boolean
}

const WELCOME_MESSAGE: Message = {
    id: WELCOME_MESSAGE_ID,
    role: "ai",
    content: `복용 정보와 주의사항을 참고용으로 정리해 줘요.\n먹고 있는 영양제 조합, 부작용, 약과 함께 먹어도 되는지 물어보세요.\n${MEDICAL_DISCLAIMER}.`,
}

function newId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

interface SttResponse {
    text: string
    status?: "success" | "unavailable"
    message?: string
    fallbackReason?: string
}

interface SupplementResponse {
    answer: string
    caution?: string | null
    sources?: unknown
    mode?: "full" | "degraded" | "fallback"
    fallback_reason?: string
    fallbackReason?: string
}

const SUGGESTED_QUESTIONS = [
    "타이레놀이랑 오메가3 같이 먹어도 돼?",
    "홍삼 복용 시 주의할 부작용이 뭐야?",
    "수술 전 피해야 할 영양제가 있을까?",
    "마그네슘과 칼슘의 올바른 복용 비율은?",
]

const SOURCE_TYPE_LABELS: Array<{ tokens: string[]; label: string }> = [
    { tokens: ["mfds", "food_safety", "ministry", "regulatory", "식약처"], label: "식약처" },
    { tokens: ["paper", "study", "pubmed", "journal", "research", "논문"], label: "논문" },
    { tokens: ["kb", "knowledge_base", "internal", "document", "doc"], label: "내부 KB" },
    { tokens: ["web", "url", "link"], label: "웹" },
]

function normalizeSources(sources: unknown): SourceDetail[] {
    if (!Array.isArray(sources)) return []
    return sources.filter((source): source is SourceDetail => {
        if (typeof source === "string") return source.trim().length > 0
        return source !== null && typeof source === "object" && !Array.isArray(source)
    })
}

function readSourceString(source: SourceDetail, keys: string[]): string | null {
    if (typeof source === "string") {
        return keys.some((key) => ["title", "name", "label", "snippet", "excerpt"].includes(key))
            ? source.trim()
            : null
    }

    for (const key of keys) {
        const value = source[key]
        if (typeof value === "string" && value.trim()) return value.trim()
    }

    const metadata = source.metadata
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        for (const key of keys) {
            const value = metadata[key]
            if (typeof value === "string" && value.trim()) return value.trim()
        }
    }

    return null
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength - 1).trim()}…`
}

function getValidUrl(source: SourceDetail): string | null {
    const raw = readSourceString(source, ["url", "link"])
    if (!raw) return null

    try {
        const url = new URL(raw)
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
    } catch {
        return null
    }
}

function getSourceTypeLabel(source: SourceDetail): string | null {
    const rawType = readSourceString(source, ["type", "category", "docType", "source"])
    if (!rawType) return null

    const normalized = rawType.toLowerCase()
    return SOURCE_TYPE_LABELS.find(({ tokens }) => tokens.some((token) => normalized.includes(token)))?.label ?? "출처"
}

function getSourceTitle(source: SourceDetail): string {
    const explicitTitle = readSourceString(source, ["title", "name", "label"])
    if (explicitTitle) return truncateText(explicitTitle, 80)

    const url = getValidUrl(source)
    if (url) return url.replace(/^https?:\/\//, "").replace(/\/$/, "")

    const snippet = readSourceString(source, ["snippet", "excerpt"])
    if (snippet) return truncateText(snippet, 80)

    return "출처 정보"
}

function getSourceSnippet(source: SourceDetail, title: string): string | null {
    const snippet = readSourceString(source, ["snippet", "excerpt"])
    if (!snippet || snippet === title) return null
    return truncateText(snippet, 120)
}

function getSourceSummary(sources: SourceDetail[]): string {
    const labels = Array.from(
        new Set(sources.map(getSourceTypeLabel).filter((label): label is string => Boolean(label)))
    )
    const labelSummary = labels.length > 0 ? ` · ${labels.slice(0, 3).join(" · ")}` : ""
    return `참고 근거 ${sources.length}개${labelSummary}`
}

function MessageSources({
    sources,
    expanded,
    onToggle,
}: {
    sources?: SourceDetail[]
    expanded: boolean
    onToggle: () => void
}) {
    if (!sources || sources.length === 0) return null

    return (
        <div className="mt-3 whitespace-normal border-t border-hairline pt-2 text-caption">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
                <span className="text-ink-2">{getSourceSummary(sources)}</span>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={expanded}
                    className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 font-bold text-ink hover:bg-hairline"
                >
                    {expanded ? "근거 접기" : "근거 보기"}
                    <ChevronDown className={cx("size-4 transition-transform duration-150", expanded && "rotate-180")} aria-hidden />
                </button>
            </div>

            {expanded && (
                <ul className="mt-1 divide-y divide-hairline">
                    {sources.map((source, index) => {
                        const title = getSourceTitle(source)
                        const snippet = getSourceSnippet(source, title)
                        const url = getValidUrl(source)
                        const typeLabel = getSourceTypeLabel(source)
                        const sourceId = readSourceString(source, ["id"])
                        const detail = [typeLabel, sourceId ? `ID ${sourceId}` : null].filter(Boolean).join(" · ")

                        return (
                            <li key={`${sourceId ?? url ?? title}-${index}`} className="py-2">
                                {url ? (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex max-w-full items-center gap-1 font-bold text-ink underline underline-offset-2"
                                    >
                                        <span className="truncate">{title}</span>
                                        <ExternalLink className="size-3 shrink-0" aria-hidden />
                                        <span className="sr-only">(새 창)</span>
                                    </a>
                                ) : (
                                    <p className="font-bold text-ink">{title}</p>
                                )}
                                {detail && <p className="mt-0.5 text-ink-2">{detail}</p>}
                                {snippet && <p className="mt-1 text-ink-2">{snippet}</p>}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

function restoreMessages(): Message[] | null {
    const stored = loadSupplementChat()
    if (!stored) return null
    return stored.map((m) => ({ ...m, sources: normalizeSources(m.sources) }))
}

export default function SupplementChatPage() {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
    const [hydrated, setHydrated] = useState(false)
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [voiceError, setVoiceError] = useState<string | null>(null)
    const chatAbortRef = useRef<AbortController | null>(null)
    const sttAbortRef = useRef<AbortController | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [expandedSourceMessageIds, setExpandedSourceMessageIds] = useState<Set<string>>(new Set())

    // 오디오 녹음(STT) 상태
    const [isRecording, setIsRecording] = useState(false)
    const [isSttLoading, setIsSttLoading] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<BlobPart[]>([])
    const mountedRef = useRef(true)

    // 드래그 스크롤(Drag-to-Scroll)을 위한 상태 및 Ref
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)

    // sessionStorage is read after mount so the server render and the first client render match.
    useEffect(() => {
        const restored = restoreMessages()
        if (restored) setMessages(restored)
        setHydrated(true)
    }, [])

    useEffect(() => {
        if (!hydrated) return
        if (messages.length <= 1 && messages[0]?.id === WELCOME_MESSAGE.id) clearSupplementChat()
        else saveSupplementChat(messages)
    }, [messages, hydrated])

    // Leaving the page: abort in-flight calls and release the microphone without uploading.
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            chatAbortRef.current?.abort()
            sttAbortRef.current?.abort()
            discardRecorder(mediaRecorderRef.current)
            mediaRecorderRef.current = null
        }
    }, [])

    // 새 메시지가 추가될 때마다 맨 아래로 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    // ==========================================
    // 오디오 녹음 및 Whisper STT 전송 (QuickLog와 동일)
    // ==========================================
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
                    // "새 대화" detached this transcription: don't drop old speech into the fresh input.
                    if (sttAbortRef.current !== controller) return
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

    // ==========================================
    // 메시지 전송
    // ==========================================
    /**
     * `fromInput`: the text came from the input box, so clearing it is expected.
     * Suggestion chips and "다시 보내기" pass false so whatever the user is typing stays put.
     * `excludeFromHistory`: ids removed in the same update ("다시 보내기"), which `messages` still holds here.
     */
    const handleSendMessage = async (
        textToSubmit: string = inputText,
        fromInput = true,
        excludeFromHistory: readonly (string | undefined)[] = [],
    ) => {
        const question = textToSubmit.trim()
        if (!question || isLoading) return

        // Turns before this question; `messages` is the state this render saw, without the new bubble.
        const history = buildSupplementHistory(messages, excludeFromHistory)
        const userMsgId = newId()
        setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: question }])
        if (fromInput) setInputText("")
        setVoiceError(null)
        setIsLoading(true)
        const controller = new AbortController()
        chatAbortRef.current = controller

        try {
            // Demo runs without the backend: answer from canned, non-medical examples.
            // A follow-up without a supplement name borrows the earlier one so the canned answer stays on topic.
            const data: SupplementResponse = isDemoMode()
                ? demoSupplementAnswer(resolveDemoFollowUpQuestion(question, history))
                : await AxiosController.post<SupplementResponse>(
                      "/api/ai/supplement-chat",
                      { question, history },
                      { timeout: AI_REQUEST_TIMEOUT_MS, signal: controller.signal },
                  )
            // "새 대화" (or leaving) detached this request: the answer belongs to a chat that no longer exists.
            if (chatAbortRef.current !== controller) return
            const newAiMsg: Message = {
                id: newId(),
                role: "ai",
                content: data.answer,
                caution: data.caution ?? null,
                sources: normalizeSources(data.sources),
                mode: data.mode,
                fallbackReason: data.fallback_reason ?? data.fallbackReason,
            }
            setMessages((prev) => [...prev, newAiMsg])
        } catch (error: unknown) {
            if (chatAbortRef.current !== controller) return
            const message = aiErrorMessage(error, "chat")
            if (message == null) {
                // User canceled: drop the unanswered question and put it back, unless they already typed something new.
                setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
                setInputText((prev) => restoreCanceledQuestion(prev, question))
            } else {
                setMessages((prev) => [
                    ...prev,
                    { id: newId(), role: "ai", content: message, isError: true, retryText: question, retryOfId: userMsgId },
                ])
            }
        } finally {
            if (chatAbortRef.current === controller) {
                chatAbortRef.current = null
                setIsLoading(false)
            }
        }
    }

    const cancelSend = () => {
        chatAbortRef.current?.abort()
    }

    const resend = (errorMsg: Message) => {
        if (!errorMsg.retryText || isLoading) return
        setMessages((prev) => prev.filter((m) => m.id !== errorMsg.id && m.id !== errorMsg.retryOfId))
        void handleSendMessage(errorMsg.retryText, false, [errorMsg.id, errorMsg.retryOfId])
    }

    const startNewChat = () => {
        // Detach first so the aborted request's handlers see it as stale and leave the new chat (and input) alone.
        const pendingChat = chatAbortRef.current
        chatAbortRef.current = null
        pendingChat?.abort()
        setIsLoading(false)
        const pendingStt = sttAbortRef.current
        sttAbortRef.current = null
        pendingStt?.abort()
        setIsSttLoading(false)
        discardRecorder(mediaRecorderRef.current)
        mediaRecorderRef.current = null
        setIsRecording(false)
        clearSupplementChat()
        setMessages([WELCOME_MESSAGE])
        setExpandedSourceMessageIds(new Set())
        setInputText("")
        setVoiceError(null)
    }

    const handleClose = () => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back()
        else router.push("/")
    }

    const onDragStart = (e: React.MouseEvent) => {
        if (!scrollRef.current) return
        setIsDragging(true)
        setStartX(e.pageX - scrollRef.current.offsetLeft)
        setScrollLeft(scrollRef.current.scrollLeft)
    }

    const onDragEnd = () => {
        setIsDragging(false)
    }

    const onDragMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return
        e.preventDefault()
        const x = e.pageX - scrollRef.current.offsetLeft
        const walk = (x - startX) * 1.5
        scrollRef.current.scrollLeft = scrollLeft - walk
    }

    const toggleMessageSources = (messageId: string) => {
        setExpandedSourceMessageIds((prev) => {
            const next = new Set(prev)
            if (next.has(messageId)) next.delete(messageId)
            else next.add(messageId)
            return next
        })
    }

    const canSend = !isLoading && inputText.trim().length > 0 && !isRecording && !isSttLoading

    return (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-ground">
            {/* 헤더 */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-ink">
                        <Pill className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-title-sm font-bold text-ink">영양제 코치</h1>
                        <p className="text-body-sm text-ink-2">영양제 조합·복용 시간·부작용을 물어보세요</p>
                    </div>
                </div>
                <div className="-mr-2 flex shrink-0 items-center">
                    {messages.length > 1 && (
                        <button
                            type="button"
                            onClick={startNewChat}
                            className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-body-sm font-bold text-ink hover:bg-surface"
                        >
                            <SquarePen className="size-4" aria-hidden />
                            새 대화
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="닫기"
                        className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </div>
            </header>

            {/* 대화 기록 */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
                {messages.map((msg) => (
                    <div key={msg.id} className={cx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div
                            className={cx(
                                "max-w-[85%] rounded-panel px-4 py-3 text-body",
                                msg.role === "user" ? "whitespace-pre-wrap bg-ink text-white" : "whitespace-pre-wrap bg-surface text-ink",
                            )}
                        >
                            {msg.role === "ai" && <span className="sr-only">코치: </span>}
                            {msg.role === "ai" && (msg.mode === "fallback" || msg.mode === "degraded") && (
                                <Notice role="note" className="mb-2 whitespace-normal">
                                    {msg.mode === "fallback"
                                        ? "AI 서버에 연결하지 못해 일반 안전 안내로 대신했어요."
                                        : "근거를 충분히 찾지 못해 간단한 안내로 답했어요. 의사·약사에게 한 번 더 확인하세요."}
                                </Notice>
                            )}
                            <div className={cx(msg.isError && "text-danger-ink")}>{msg.content}</div>
                            {msg.isError && msg.retryText && (
                                <Button
                                    variant="secondary"
                                    className="mt-2"
                                    icon={<RotateCcw className="size-4" aria-hidden />}
                                    onClick={() => resend(msg)}
                                    disabled={isLoading}
                                >
                                    다시 보내기
                                </Button>
                            )}
                            {msg.role === "ai" && msg.caution && msg.caution.trim().length > 0 && (
                                <Notice tone="danger" role="note" title="주의사항" className="mt-3 whitespace-normal">
                                    <p className="whitespace-pre-wrap">{msg.caution}</p>
                                </Notice>
                            )}
                            {msg.role === "ai" && (
                                <MessageSources
                                    sources={msg.sources}
                                    expanded={expandedSourceMessageIds.has(msg.id)}
                                    onToggle={() => toggleMessageSources(msg.id)}
                                />
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start" aria-busy="true">
                        <div className="flex items-center gap-2 rounded-panel bg-surface py-1 pl-4 pr-1">
                            <Loader2 className="size-4 shrink-0 animate-spin text-ink-2 motion-reduce:animate-none" aria-hidden />
                            <span className="text-body-sm text-ink-2">관련 근거와 주의 문구를 확인하고 있어요</span>
                            <Button variant="ghost" onClick={cancelSend}>
                                취소
                            </Button>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 하단 입력 */}
            <div className="shrink-0 border-t border-hairline bg-ground pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                {messages.length === 1 && (
                    <div
                        ref={scrollRef}
                        onMouseDown={onDragStart}
                        onMouseLeave={onDragEnd}
                        onMouseUp={onDragEnd}
                        onMouseMove={onDragMove}
                        className={cx(
                            "mb-3 flex select-none gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                            isDragging ? "cursor-grabbing" : "cursor-grab",
                        )}
                    >
                        {SUGGESTED_QUESTIONS.map((q, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSendMessage(q, false)}
                                className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-rail bg-ground px-3.5 text-body-sm text-ink hover:border-ink-3"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                <div className="px-4">
                    {voiceError && (
                        <Notice tone="danger" title="음성 입력 문제" className="mb-3">
                            {voiceError}
                        </Notice>
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

                        <label htmlFor="supplement-input" className="sr-only">
                            질문
                        </label>
                        <textarea
                            id="supplement-input"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    if (canSend) {
                                        handleSendMessage()
                                    }
                                }
                            }}
                            placeholder={isSttLoading ? "음성을 글자로 바꾸는 중" : "영양제에 대해 물어보세요"}
                            disabled={isSttLoading || isLoading || isRecording}
                            rows={1}
                            className="field-sizing-content min-h-11 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-control border border-rail bg-ground px-3 py-2.5 text-body leading-6 text-ink [scrollbar-width:thin] placeholder:text-ink-2 hover:border-ink-3 focus:border-ink focus:outline-none disabled:bg-surface"
                        />

                        <button
                            type="button"
                            onClick={() => handleSendMessage()}
                            disabled={!canSend}
                            aria-label="질문 보내기"
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
                                <Button variant="ghost" onClick={() => sttAbortRef.current?.abort()}>
                                    취소
                                </Button>
                            )}
                        </div>
                    )}
                    <p className="mt-2 text-center text-caption text-ink-2">{MEDICAL_DISCLAIMER}.</p>
                </div>
            </div>
        </div>
    )
}
