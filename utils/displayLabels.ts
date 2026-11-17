/**
 * Display-only Korean labels for contract codes. Values sent to BE/AI stay as the SSOT codes;
 * only what the user reads goes through here. Unknown codes never render raw.
 */

const MUSCLE_LABEL: Record<string, string> = {
    chest: "가슴",
    "upper-back": "등",
    "lower-back": "허리",
    trapezius: "승모근",
    "front-deltoids": "전면 어깨",
    "side-deltoids": "측면 어깨",
    "back-deltoids": "후면 어깨",
    biceps: "이두",
    triceps: "삼두",
    forearm: "전완",
    abs: "복부",
    obliques: "옆구리",
    gluteal: "둔근",
    quadriceps: "앞 허벅지",
    hamstring: "뒤 허벅지",
    adductor: "내전근",
    abductors: "외전근",
    calves: "종아리",
    neck: "목",
    "left-soleus": "왼쪽 가자미근",
    "right-soleus": "오른쪽 가자미근",
    head: "머리",
    knees: "무릎",
}

/**
 * Selectable body-part slugs, ordered top to bottom for the accessible list next to the body diagram.
 * Values follow docs/ops/golden-examples/muscle-slug-whitelist-v3 (exercise_tier.xlsx primary_muscle);
 * this is an ordering of that vocabulary, not a new one.
 */
export const TRAINABLE_MUSCLE_SLUGS = [
    "neck",
    "trapezius",
    "front-deltoids",
    "back-deltoids",
    "chest",
    "upper-back",
    "lower-back",
    "biceps",
    "triceps",
    "forearm",
    "abs",
    "obliques",
    "gluteal",
    "quadriceps",
    "hamstring",
    "adductor",
    "abductors",
    "calves",
] as const

/** Pain areas add the pain-only slugs of the same whitelist. */
export const PAIN_AREA_SLUGS = [
    "head",
    ...TRAINABLE_MUSCLE_SLUGS.slice(0, 12),
    "gluteal",
    "quadriceps",
    "hamstring",
    "adductor",
    "abductors",
    "knees",
    "calves",
    "left-soleus",
    "right-soleus",
] as const

export function muscleLabel(slug: string | null | undefined): string {
    if (!slug) return "부위 미지정"
    return MUSCLE_LABEL[slug.trim()] ?? "기타 부위"
}

const EQUIPMENT_LABEL: Record<string, string> = {
    BAND: "밴드",
    BARBELL: "바벨",
    BODYWEIGHT: "맨몸",
    CABLE: "케이블",
    DUMBBELL: "덤벨",
    KETTLEBELL: "케틀벨",
    LANDMINE: "랜드마인",
    MACHINE: "머신",
    PLATE: "원판",
    SMITH_MACHINE: "스미스 머신",
}

export function equipmentLabel(code: string | null | undefined): string {
    if (!code) return "장비 미지정"
    return EQUIPMENT_LABEL[code.trim().toUpperCase()] ?? "기타 장비"
}

const SPLIT_LABEL: Record<string, string> = {
    push: "밀기",
    pull: "당기기",
    legs: "하체",
    lower: "하체",
    upper: "상체",
    chest_back: "가슴·등",
    chest: "가슴",
    back: "등",
    shoulder: "어깨",
    arm: "팔",
    core: "코어",
    neck: "목",
    full_body: "전신",
    full: "전신",
    custom: "직접 선택",
}

export function splitLabel(code: string | null | undefined): string {
    if (!code) return "루틴"
    return SPLIT_LABEL[code.trim().toLowerCase()] ?? "루틴"
}

/** Title from a split field: a known code becomes "밀기 루틴", human-written Korean passes through, other codes yield null. */
export function splitTitle(value: string | null | undefined): string | null {
    const trimmed = value?.trim()
    if (!trimmed) return null
    const label = SPLIT_LABEL[trimmed.toLowerCase()]
    if (label) return `${label} 루틴`
    return /[가-힣]/.test(trimmed) ? trimmed : null
}

const GOAL_LABEL: Record<string, string> = {
    hypertrophy: "근비대",
    strength: "근력",
    endurance: "근지구력",
    fatLoss: "체지방 감량",
    recomposition: "바디 리컴포지션",
    generalFitness: "건강 유지",
}

export function goalLabel(code: string | null | undefined): string {
    return (code && GOAL_LABEL[code.trim()]) || "목표 미지정"
}

const EXPERIENCE_LABEL: Record<string, string> = {
    beginner: "초급",
    intermediate: "중급",
    advanced: "상급",
}

export function experienceLabel(code: string | null | undefined): string {
    return (code && EXPERIENCE_LABEL[code.trim().toLowerCase()]) || "경력 미지정"
}

const READINESS_LABEL: Record<string, string> = {
    low: "피곤함",
    normal: "보통",
    high: "좋음",
}

export function readinessLabel(code: string | null | undefined): string {
    return (code && READINESS_LABEL[code.trim().toLowerCase()]) || "보통"
}

const SET_TYPE_LABEL: Record<string, string> = {
    working: "본세트",
    warmup: "워밍업",
    drop: "드롭세트",
    failure: "실패 지점",
    timed: "시간",
    distance: "거리",
    interval: "인터벌",
}

export function setTypeLabel(code: string | null | undefined): string {
    return (code && SET_TYPE_LABEL[code.trim().toLowerCase()]) || "본세트"
}

const MEAL_LABEL: Record<string, string> = {
    breakfast: "아침",
    lunch: "점심",
    dinner: "저녁",
    snack: "간식",
}

export function mealLabel(code: string | null | undefined): string {
    return (code && MEAL_LABEL[code.trim().toLowerCase()]) || "기타"
}

/** Short reason shown on a fallback routine. `none` and unknown codes yield null: say nothing rather than a code. */
const FALLBACK_REASON_LABEL: Record<string, string> = {
    llmTimeout: "AI 응답이 늦어 기본 규칙으로 만들었어요",
    ai_timeout: "AI 응답이 늦어 기본 규칙으로 만들었어요",
    schemaError: "AI 응답을 해석하지 못해 기본 규칙으로 만들었어요",
    ai_bad_response: "AI 응답을 해석하지 못해 기본 규칙으로 만들었어요",
    ai_schema_mismatch: "AI 응답을 해석하지 못해 기본 규칙으로 만들었어요",
    networkError: "AI 서버에 연결하지 못해 기본 규칙으로 만들었어요",
    ai_server_unavailable: "AI 서버에 연결하지 못해 기본 규칙으로 만들었어요",
    ai_connection_refused: "AI 서버에 연결하지 못해 기본 규칙으로 만들었어요",
    ai_remote_error: "AI 서버 오류로 기본 규칙으로 만들었어요",
    ai_disabled: "AI 기능이 꺼져 있어 기본 규칙으로 만들었어요",
    unknown_ai_error: "AI 응답을 쓸 수 없어 기본 규칙으로 만들었어요",
    emptyCandidate: "조건에 맞는 운동을 찾지 못했어요",
}

export function fallbackReasonLabel(code: string | null | undefined): string | null {
    if (!code) return null
    return FALLBACK_REASON_LABEL[code.trim()] ?? null
}

/** Reason shown when generation failed outright (`generationStatus: failed`). Unknown codes get a generic line. */
const GENERATE_FAILED_REASON_LABEL: Record<string, string> = {
    emptyCandidate: "고른 부위·장비·통증 조건에 맞는 운동을 찾지 못했어요.",
}

export function generateFailedReasonLabel(code: string | null | undefined): string {
    return (code && GENERATE_FAILED_REASON_LABEL[code.trim()]) || "지금 조건으로는 루틴을 만들 수 없어요."
}

export type GenerateErrorKind = "network" | "timeout" | "badRequest" | "rateLimited" | "server" | "invalidResponse" | "unknown"

/**
 * Classifies a thrown generate error. Axios errors carry `response.status` for 4xx/5xx and no response for
 * network failures; the runtime response guard throws an Error whose message starts with "[Runtime Guard]".
 */
export function classifyGenerateError(err: unknown): GenerateErrorKind {
    if (err instanceof Error && err.message.startsWith("[Runtime Guard]")) return "invalidResponse"
    if (typeof err !== "object" || err === null) return "unknown"
    const e = err as { code?: unknown; response?: { status?: unknown }; isAxiosError?: unknown; request?: unknown }
    const status = typeof e.response?.status === "number" ? e.response.status : null
    if (status !== null) {
        if (status === 408 || status === 504) return "timeout"
        if (status === 429) return "rateLimited"
        if (status >= 500) return "server"
        if (status >= 400) return "badRequest"
        return "unknown"
    }
    if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return "timeout"
    if (e.code === "ERR_NETWORK" || e.isAxiosError === true || e.request !== undefined) return "network"
    return "unknown"
}

const GENERATE_ERROR_COPY: Record<GenerateErrorKind, { title: string; description: string; retryable: boolean }> = {
    network: { title: "서버에 연결하지 못했어요", description: "인터넷 연결을 확인한 뒤 다시 시도하세요.", retryable: true },
    timeout: { title: "응답이 너무 늦어요", description: "서버가 바빠요. 잠시 뒤 다시 시도하세요.", retryable: true },
    rateLimited: { title: "요청이 너무 많아요", description: "잠시 기다린 뒤 다시 시도하세요.", retryable: true },
    server: { title: "서버에 문제가 생겼어요", description: "잠시 뒤 다시 시도하세요. 계속되면 나중에 다시 와 주세요.", retryable: true },
    badRequest: { title: "요청을 처리하지 못했어요", description: "고른 조건을 확인하거나 바꾼 뒤 다시 만들어 보세요.", retryable: false },
    invalidResponse: { title: "받은 루틴을 읽지 못했어요", description: "응답이 올바르지 않았어요. 다시 시도하면 새로 만들어요.", retryable: true },
    unknown: { title: "루틴을 만들지 못했어요", description: "잠시 뒤 다시 시도하세요.", retryable: true },
}

export function generateErrorCopy(kind: GenerateErrorKind) {
    return GENERATE_ERROR_COPY[kind]
}

/** Badge text for a routine's origin. */
export function routineOriginLabel(opts: { isManual?: boolean; isFallback?: boolean }): string {
    if (opts.isManual) return "직접 작성"
    if (opts.isFallback) return "기본 규칙 루틴"
    return "AI 추천 루틴"
}
