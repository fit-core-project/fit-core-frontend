/**
 * Conversation history sent with POST /api/ai/supplement-chat as `history`.
 * Contract: docs/ops/golden-examples/supplement-chat.request.golden.json.
 */
import { DEMO_AI_NOTICE, demoSupplementMentions } from "@/utils/demoSupplementAi"

/** The AI server keeps at most 12 turns; that is the window sent. */
export const SUPPLEMENT_HISTORY_MAX_TURNS = 12
export const SUPPLEMENT_HISTORY_MAX_CONTENT_CHARS = 500
export const WELCOME_MESSAGE_ID = "welcome"

export interface SupplementHistoryTurn {
    role: "user" | "assistant"
    content: string
}

export interface ChatMessageLike {
    id: string
    role: "user" | "ai"
    content: string
    isError?: boolean
}

const DEMO_NOTICE_PREFIX = `[${DEMO_AI_NOTICE}]`

function isRealTurn(message: ChatMessageLike): boolean {
    if (message.id === WELCOME_MESSAGE_ID || message.isError) return false
    if (message.role === "ai" && message.content.trimStart().startsWith(DEMO_NOTICE_PREFIX)) return false
    return true
}

/**
 * Last real turns before the current question: no welcome message, error bubbles or demo answers.
 * `excludeIds` drops messages the caller is removing in the same update (e.g. the failed question on resend).
 * A user question whose answer failed is kept: it is still something the user asked.
 */
export function buildSupplementHistory(
    messages: readonly ChatMessageLike[],
    excludeIds: readonly (string | undefined)[] = [],
): SupplementHistoryTurn[] {
    const excluded = new Set(excludeIds.filter((id): id is string => Boolean(id)))
    const turns: SupplementHistoryTurn[] = []
    for (const message of messages) {
        if (excluded.has(message.id) || !isRealTurn(message)) continue
        const content = message.content.trim().slice(0, SUPPLEMENT_HISTORY_MAX_CONTENT_CHARS)
        if (!content) continue
        turns.push({ role: message.role === "ai" ? "assistant" : "user", content })
    }
    // Over the window, drop the oldest assistant answers first: the server's follow-up rule reads only
    // user turns, so a long chain of follow-ups ("그럼 언제?", "공복에는?", ...) keeps the ingredient.
    while (turns.length > SUPPLEMENT_HISTORY_MAX_TURNS) {
        const oldestAnswer = turns.findIndex((turn) => turn.role === "assistant")
        turns.splice(oldestAnswer >= 0 ? oldestAnswer : 0, 1)
    }
    return turns
}

/**
 * Demo-mode mirror of the AI server's follow-up rule: a question that names no supplement borrows the
 * supplements of the most recent user turn that had some ("그럼 몇 시에 먹어요?" -> "마그네슘 관련 추가 질문: ...").
 */
// Same rule as fit-core-ai engines/supplement_history.is_new_topic: only a search for a different or
// general supplement, or a message that is entirely small talk, drops the previous ingredient.
const NEW_TOPIC_PATTERNS = [
    /다른\s*(?:영양제|보충제|성분|제품|비타민)/,
    /(?:말고|빼고|외에|이외에?|대신)\s*(?:다른|뭐|어떤|딴)/,
    /다른\s*(?:것|거|걸)\s*(?:있|없|알려|뭐|추천)/,
    /(?:어떤|무슨|뭔|어느)\s*(?:영양제|보충제)/,
    // "수면에 좋은 영양제", but not the confirmation "괜찮은 영양제인가요?"
    /(?:좋은|먹을\s*만한|괜찮은)\s*(?:영양제|보충제)(?!\s*(?:인가|이에|예요|인지|맞|일까|이야|이죠|인데))/,
]
// "추천" is a new search unless it is about the current one's dose or time ("추천 복용량이 얼마예요?").
const RECOMMEND_RE = /추천/
const EXCLUDING_RE = /말고|빼고|외에|이외|대신\s*다른/
const DOSE_WORDS_RE = /복용량|용량|권장량|섭취량|하루\s*몇|몇\s*(?:mg|알|정|번)|언제|시간|타이밍/
const SMALL_TALK_RE =
    /^(?:고마워요?|고맙습니다|감사(?:합니다|해요|요)?|안녕(?:하세요)?|알겠(?:어요|습니다|어)|수고(?:하세요|하셨어요)?|넵|네|ㅇㅋ|오케이|ok|okay|thanks?(?:you)?)[!.~ㅎㅋ^]*$/

/** The user asks for a different or general supplement: earlier turns are no longer the topic. */
export function isTopicShift(question: string): boolean {
    const text = question.trim().toLowerCase()
    if (NEW_TOPIC_PATTERNS.some((pattern) => pattern.test(text))) return true
    return RECOMMEND_RE.test(text) && !DOSE_WORDS_RE.test(text)
}

export function isNewTopic(question: string): boolean {
    if (isTopicShift(question)) return true
    const text = question.trim().toLowerCase()
    const compact = text.replace(/\s+/g, "")
    return !compact.includes("?") && SMALL_TALK_RE.test(compact)
}

export function resolveDemoFollowUpQuestion(question: string, history: readonly SupplementHistoryTurn[]): string {
    if (history.length === 0 || demoSupplementMentions(question).length > 0 || isNewTopic(question)) return question
    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i]
        if (turn.role !== "user") continue
        const mentions = demoSupplementMentions(turn.content)
        // the user changed the subject ("다른 영양제도 알려줘"): nothing before it is the topic any more
        // "마그네슘 말고 다른 거 있어?" names magnesium only to exclude it: that is a topic change too
        if (isTopicShift(turn.content) && (mentions.length === 0 || EXCLUDING_RE.test(turn.content))) return question
        if (mentions.length > 0) return `${mentions.join(", ")} 관련 추가 질문: ${question}`
    }
    return question
}
