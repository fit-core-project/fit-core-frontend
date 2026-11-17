/** Per-tab supplement chat history (sessionStorage): survives a refresh, not a new tab. */
export const SUPPLEMENT_CHAT_STORAGE_KEY = "fitcore_supplement_chat_v1"
const MAX_STORED_MESSAGES = 60

export const MEDICAL_DISCLAIMER = "의료 조언이 아니며, 복용 전 의사·약사와 상담하세요"

export interface StoredChatMessage {
    id: string
    role: "user" | "ai"
    content: string
    caution?: string | null
    sources?: unknown[]
    mode?: "full" | "degraded" | "fallback"
    fallbackReason?: string
    /** Set on an error bubble: the question to resend. */
    retryText?: string
    isError?: boolean
}

function isStoredMessage(value: unknown): value is StoredChatMessage {
    if (!value || typeof value !== "object") return false
    const m = value as Record<string, unknown>
    return typeof m.id === "string" && (m.role === "user" || m.role === "ai") && typeof m.content === "string"
}

export function parseStoredChat(raw: string | null): StoredChatMessage[] | null {
    if (!raw) return null
    try {
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return null
        const messages = parsed.filter(isStoredMessage)
        return messages.length > 0 ? messages : null
    } catch {
        return null
    }
}

export function loadSupplementChat(): StoredChatMessage[] | null {
    if (typeof window === "undefined") return null
    try {
        return parseStoredChat(window.sessionStorage.getItem(SUPPLEMENT_CHAT_STORAGE_KEY))
    } catch {
        return null
    }
}

export function saveSupplementChat(messages: StoredChatMessage[]): void {
    if (typeof window === "undefined") return
    try {
        window.sessionStorage.setItem(SUPPLEMENT_CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
    } catch {
        // storage full or blocked: history just won't survive a refresh
    }
}

/**
 * Removes the stored chat. Besides "새 대화", the auth store calls this on logout, withdrawal and
 * account switch: the chat can hold health information (medication questions).
 */
export function clearSupplementChat(storage?: Pick<Storage, "removeItem">): void {
    let target = storage
    if (!target) {
        if (typeof window === "undefined") return
        try {
            target = window.sessionStorage
        } catch {
            return
        }
    }
    try {
        target.removeItem(SUPPLEMENT_CHAT_STORAGE_KEY)
    } catch {
        // ignore
    }
}
