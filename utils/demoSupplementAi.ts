/**
 * Demo-mode stand-in for POST /api/ai/supplement-chat: canned, non-medical answers.
 * Separate from the quicklog parser in demoAi.ts so the supplement page only loads what it needs.
 */
export const DEMO_AI_NOTICE = "데모 모드 예시 답변"

// ---------------------------------------------------------------------------
// Supplement chat
// ---------------------------------------------------------------------------

export interface DemoSupplementResponse {
    answer: string
    caution: string | null
    sources?: unknown
    mode: "full"
}

interface SupplementTopic {
    keywords: RegExp
    answer: string
}

const SUPPLEMENT_TOPICS: SupplementTopic[] = [
    {
        keywords: /마그네슘/,
        answer:
            "마그네슘\n- 저녁이나 식사와 함께 먹는 경우가 많아요. 공복에 먹고 속이 불편하면 식후로 옮겨 보세요.\n- 일부 항생제, 갑상선 약, 골다공증 약과는 흡수를 서로 방해할 수 있어 시간 간격을 두는 편이에요.\n- 철분·칼슘을 많이 함께 먹으면 흡수가 줄 수 있어요.\n- 콩팥 질환이 있다면 먼저 의사와 상의하세요.",
    },
    {
        keywords: /비타민\s*d|비타민\s*디|vitamin\s*d/i,
        answer:
            "비타민 D\n- 지용성이라 기름기가 있는 식사와 함께 먹으면 흡수가 잘 되는 편이에요.\n- 하루 중 시간은 크게 상관없으니 매일 같은 때에 먹는 게 잊지 않기 좋아요.\n- 고용량을 오래 먹는 건 피하고, 제품 표기량을 지키세요. 필요한 양은 혈액검사로 확인할 수 있어요.",
    },
    {
        keywords: /오메가\s*-?\s*3|오메가쓰리|피쉬\s*오일|피시\s*오일|어유|omega/i,
        answer:
            "오메가3\n- 식사와 함께 먹으면 비린 트림과 속쓰림이 줄어드는 편이에요.\n- 와파린 같은 항응고제나 아스피린 같은 항혈소판제를 먹고 있다면 출혈 경향이 커질 수 있어 먼저 확인이 필요해요.\n- 수술이나 시술을 앞두고 있다면 미리 의료진에게 알려 주세요.",
    },
    {
        keywords: /크레아틴|creatine/i,
        answer:
            "크레아틴\n- 먹는 시간보다 매일 꾸준히 먹는 게 더 중요하다고 알려져 있어요. 운동 전후 어느 쪽이든 괜찮아요.\n- 물을 평소보다 넉넉히 마시세요.\n- 콩팥 질환이 있거나 콩팥에 영향을 주는 약을 먹고 있다면 먼저 의사와 상의하세요.",
    },
    {
        keywords: /철분|철\s*보충|iron/i,
        answer:
            "철분\n- 공복에 흡수가 잘 되지만 속이 불편하면 식후에 먹어도 돼요. 비타민 C가 든 음식과 함께 먹으면 흡수에 도움이 돼요.\n- 우유·칼슘제·커피·차·제산제와는 시간 간격을 두는 편이에요.\n- 갑상선 약이나 일부 항생제와도 흡수를 서로 방해할 수 있어요.\n- 철분은 많이 먹으면 해로울 수 있어요. 결핍이 확인되지 않았다면 고용량은 피하세요.",
    },
]

/** Supplement names a demo answer exists for, as written in `text` (e.g. "마그네슘"). Empty when none. */
export function demoSupplementMentions(text: string): string[] {
    const mentions: string[] = []
    for (const topic of SUPPLEMENT_TOPICS) {
        const match = text.match(topic.keywords)
        if (match && !mentions.includes(match[0])) mentions.push(match[0])
    }
    return mentions
}

const GENERIC_ANSWER =
    "이 질문은 데모용 예시 답변이 준비되어 있지 않아요.\n영양제는 제품 표기량을 지키고, 새로 시작하거나 여러 개를 함께 먹을 때는 의사나 약사에게 먼저 물어보는 게 안전해요.\n데모에서는 마그네슘, 비타민 D, 오메가3, 크레아틴, 철분의 복용 시간과 함께 먹을 때 주의점을 예시로 볼 수 있어요."

const MEDICATION_RE = /약|타이레놀|아스피린|와파린|항생제|처방|복용\s*중|진통제|혈압|당뇨|임신|수유/

const BASE_CAUTION = "참고용 일반 정보예요. 증상이 있거나 약을 먹고 있다면 의사·약사에게 확인하세요."
const MEDICATION_CAUTION =
    "먹고 있는 약이 있다면 영양제와 함께 먹어도 되는지 꼭 의사·약사에게 확인하세요. 이 답변은 데모용 예시라 개인 상황을 반영하지 않아요."

/** Canned stand-in for POST /api/ai/supplement-chat. The notice lives in `answer` so it survives in saved chat history. */
export function demoSupplementAnswer(question: string): DemoSupplementResponse {
    const topics = SUPPLEMENT_TOPICS.filter((t) => t.keywords.test(question))
    const body = topics.length > 0 ? topics.map((t) => t.answer).join("\n\n") : GENERIC_ANSWER
    return {
        answer: `[${DEMO_AI_NOTICE}] 실제 AI 상담이 아니라 미리 준비한 예시예요.\n\n${body}`,
        caution: MEDICATION_RE.test(question) ? MEDICATION_CAUTION : BASE_CAUTION,
        mode: "full",
    }
}
