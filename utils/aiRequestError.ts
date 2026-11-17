/** Per-request timeout for AI calls (parse-diet, supplement-chat). */
export const AI_REQUEST_TIMEOUT_MS = 90_000
/** Speech-to-text is shorter work; fail sooner. */
export const STT_REQUEST_TIMEOUT_MS = 60_000

export type AiErrorKind = "canceled" | "timeout" | "network" | "busy" | "rate_limited" | "invalid" | "generic"
export type AiTask = "parse" | "chat" | "stt"

interface ErrorLike {
    code?: string
    name?: string
    response?: { status?: number } | null
}

export function classifyAiError(err: unknown): AiErrorKind {
    const e = (err && typeof err === "object" ? err : {}) as ErrorLike
    if (e.code === "ERR_CANCELED" || e.name === "CanceledError" || e.name === "AbortError") return "canceled"
    if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return "timeout"
    const status = e.response?.status
    // Only a sent request with no response is a network problem; plain JS errors stay generic.
    if (status == null) return e.code === "ERR_NETWORK" || "request" in e ? "network" : "generic"
    if (status === 429) return "rate_limited"
    if (status >= 500) return "busy"
    if (status === 400 || status === 422) return "invalid"
    return "generic"
}

const MESSAGES: Record<AiTask, Record<Exclude<AiErrorKind, "canceled">, string>> = {
    parse: {
        timeout: "분석이 너무 오래 걸려 멈췄어요. 문장을 조금 짧게 나눠 다시 보내 주세요.",
        network: "인터넷 연결이 불안정해요. 연결을 확인하고 다시 보내 주세요.",
        busy: "AI 서버가 바빠요. 잠시 후 다시 보내 주세요.",
        rate_limited: "요청이 너무 많아요. 잠시 후 다시 보내 주세요.",
        invalid: "문장을 이해하지 못했어요. 음식 이름과 양을 함께 적어 주세요.",
        generic: "분석하지 못했어요. 잠시 후 다시 보내 주세요.",
    },
    chat: {
        timeout: "답변이 너무 오래 걸려 멈췄어요. 질문을 조금 짧게 해서 다시 보내 주세요.",
        network: "인터넷 연결이 불안정해요. 연결을 확인하고 다시 보내 주세요.",
        busy: "AI 서버가 바빠요. 잠시 후 다시 보내 주세요.",
        rate_limited: "질문이 너무 많아요. 잠시 후 다시 보내 주세요.",
        invalid: "질문을 이해하지 못했어요. 다른 말로 다시 물어봐 주세요.",
        generic: "답변을 받지 못했어요. 잠시 후 다시 보내 주세요.",
    },
    stt: {
        timeout: "음성 인식이 너무 오래 걸려 멈췄어요. 다시 말하거나 글로 적어 주세요.",
        network: "인터넷 연결이 불안정해 음성을 보내지 못했어요. 글로 적어 주세요.",
        busy: "음성 인식 서버가 바빠요. 잠시 후 다시 말하거나 글로 적어 주세요.",
        rate_limited: "음성 인식 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
        invalid: "음성을 알아듣지 못했어요. 다시 말하거나 글로 적어 주세요.",
        generic: "음성을 알아듣지 못했어요. 다시 말하거나 글로 적어 주세요.",
    },
}

/** Friendly Korean copy that never exposes raw axios/server text. Returns null when the user canceled. */
export function aiErrorMessage(err: unknown, task: AiTask): string | null {
    const kind = classifyAiError(err)
    if (kind === "canceled") return null
    return MESSAGES[task][kind]
}

/** getUserMedia / MediaRecorder failures (before anything is sent). */
export function micErrorMessage(err: unknown): string {
    const name = err && typeof err === "object" ? (err as { name?: string }).name : undefined
    if (name === "NotAllowedError" || name === "SecurityError") {
        return "마이크 권한이 없어요. 브라우저 설정에서 마이크를 허용하거나 글로 적어 주세요."
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
        return "마이크를 찾지 못했어요. 글로 적어 주세요."
    }
    if (name === "NotReadableError") {
        return "다른 앱이 마이크를 쓰고 있어요. 잠시 후 다시 시도하거나 글로 적어 주세요."
    }
    return "이 브라우저에서는 녹음을 시작하지 못했어요. 글로 적어 주세요."
}
