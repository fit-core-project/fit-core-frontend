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

/** Badge text for a routine's origin. */
export function routineOriginLabel(opts: { isManual?: boolean; isFallback?: boolean }): string {
    if (opts.isManual) return "직접 작성"
    if (opts.isFallback) return "기본 규칙 루틴"
    return "AI 추천 루틴"
}
