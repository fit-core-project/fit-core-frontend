/**
 * Demo-mode stand-ins for the AI endpoints, so a demo runs without the backend.
 * - Quicklog: a small deterministic parser over a built-in food table (same shape as POST /api/ai/parse-diet).
 * - Supplement: canned, non-medical answers (same shape as POST /api/ai/supplement-chat).
 * Kept free of imports from demoMode.ts so the seed data does not ride along.
 */
import type { MealType, ParseDietItem } from "@/utils/quicklogDraft"

import { DEMO_AI_NOTICE } from "./demoSupplementAi"
export { DEMO_AI_NOTICE }

// ---------------------------------------------------------------------------
// Quicklog
// ---------------------------------------------------------------------------

interface DemoFood {
    name: string
    aliases: string[]
    /** One serving: `servingAmount` of `unit`, weighing `servingG` grams (or ml). */
    servingAmount: number
    unit: string
    servingG: number
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
}

const food = (
    name: string,
    aliases: string[],
    unit: string,
    servingG: number,
    kcal: number,
    proteinG: number,
    carbsG: number,
    fatG: number,
): DemoFood => ({ name, aliases: [name, ...aliases], servingAmount: 1, unit, servingG, kcal, proteinG, carbsG, fatG })

/** Per-serving values are rounded reference figures for the demo, not a nutrition database. */
export const DEMO_FOODS: DemoFood[] = [
    food("쌀밥", ["흰쌀밥", "공기밥", "흰밥", "밥"], "공기", 210, 315, 5.7, 69, 0.6),
    food("현미밥", [], "공기", 210, 310, 6.5, 66, 2),
    food("잡곡밥", [], "공기", 210, 315, 6.5, 68, 1.5),
    food("김치찌개", [], "그릇", 400, 250, 15, 12, 15),
    food("된장찌개", [], "그릇", 400, 180, 12, 14, 8),
    food("순두부찌개", [], "그릇", 400, 220, 14, 10, 14),
    food("미역국", [], "그릇", 300, 80, 5, 4, 4.5),
    food("김치", ["배추김치"], "접시", 50, 15, 1, 2.4, 0.3),
    food("닭가슴살 샐러드", ["닭가슴살샐러드"], "그릇", 250, 230, 28, 10, 8),
    food("닭가슴살", [], "개", 100, 110, 23, 0, 1.2),
    food("계란후라이", ["달걀후라이", "계란프라이", "달걀프라이"], "개", 60, 90, 6.5, 0.5, 7),
    food("삶은 달걀", ["삶은 계란", "삶은달걀", "삶은계란", "계란", "달걀"], "개", 50, 75, 6.3, 0.6, 5),
    food("바나나", [], "개", 120, 105, 1.3, 27, 0.4),
    food("사과", [], "개", 200, 105, 0.5, 28, 0.3),
    food("고구마", [], "개", 130, 116, 1.6, 27.4, 0.1),
    food("감자", [], "개", 150, 115, 3, 26, 0.2),
    food("토마토", ["방울토마토"], "개", 150, 27, 1.3, 5.8, 0.3),
    food("아메리카노", ["블랙커피"], "잔", 355, 10, 0.5, 1.5, 0.1),
    food("카페라떼", ["라떼", "카페 라떼"], "잔", 355, 180, 9, 14, 9),
    food("컵라면", [], "개", 65, 280, 6, 40, 11),
    food("라면", ["신라면"], "봉지", 120, 500, 10, 79, 16),
    food("제육볶음", ["제육"], "인분", 200, 400, 25, 15, 26),
    food("불고기", [], "인분", 200, 330, 26, 14, 18),
    food("비빔밥", [], "그릇", 450, 560, 20, 85, 15),
    food("김밥", [], "줄", 230, 420, 12, 68, 10),
    food("떡볶이", [], "인분", 250, 480, 10, 95, 6),
    food("짜장면", ["자장면"], "그릇", 650, 780, 22, 130, 20),
    food("짬뽕", [], "그릇", 900, 690, 35, 95, 18),
    food("칼국수", [], "그릇", 650, 560, 20, 100, 8),
    food("냉면", ["물냉면"], "그릇", 600, 500, 15, 95, 5),
    food("삼겹살", [], "인분", 200, 660, 34, 0, 58),
    food("치킨", ["후라이드치킨", "프라이드치킨"], "조각", 100, 270, 18, 9, 18),
    food("돈까스", ["돈가스"], "인분", 200, 550, 25, 40, 32),
    food("샌드위치", [], "개", 200, 400, 18, 42, 17),
    food("햄버거", [], "개", 220, 520, 25, 45, 27),
    food("샐러드", [], "그릇", 200, 120, 3, 10, 8),
    food("우유", [], "컵", 200, 130, 6.4, 9.6, 7.6),
    food("두유", [], "팩", 190, 120, 6, 11, 5),
    food("그릭요거트", ["그릭 요거트"], "컵", 100, 95, 9, 4, 5),
    food("요거트", ["요구르트"], "컵", 100, 85, 3.5, 12, 2.8),
    food("프로틴 쉐이크", ["프로틴쉐이크", "단백질 쉐이크", "단백질쉐이크", "프로틴"], "스쿱", 30, 120, 24, 3, 1.5),
    food("오트밀", [], "컵", 40, 150, 5.3, 27, 2.7),
    food("식빵", [], "장", 35, 95, 3.2, 17, 1.3),
    food("연어", ["연어 스테이크", "연어스테이크"], "조각", 100, 206, 20, 0, 13.4),
    food("소고기", ["스테이크"], "인분", 150, 375, 39, 0, 24),
    food("두부", [], "모", 300, 252, 27, 6, 14),
    food("고등어구이", ["고등어"], "토막", 100, 230, 20, 0, 16.5),
    food("아몬드", [], "줌", 25, 145, 5.3, 5.4, 12.5),
    food("콜라", [], "캔", 355, 150, 0, 39, 0),
]

/** Rough per-serving guess for foods outside the table; shown as "AI 추정" so the user checks it. */
const UNKNOWN_SERVING = { unit: "인분", servingG: 250, proteinG: 10, carbsG: 30, fatG: 10 }

const ALIASES = DEMO_FOODS.flatMap((f) => f.aliases.map((alias) => ({ alias, food: f }))).sort(
    (a, b) => b.alias.length - a.alias.length,
)

const MEAL_WORDS: [RegExp, MealType][] = [
    [/아침/, "breakfast"],
    [/브런치|점심/, "lunch"],
    [/저녁|석식/, "dinner"],
    [/간식|야식|디저트/, "snack"],
]
const MEAL_WORD_RE = /아침|브런치|점심|저녁|석식|간식|야식|디저트|오늘|어제/g

const KOREAN_NUM: Record<string, number> = {
    한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 석: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6, 반: 0.5,
}
const COUNT_UNITS = "개|공기|그릇|잔|조각|인분|컵|봉지|캔|장|쪽|줄|접시|스쿱|팩|병|모|토막|줌|알"
const GRAM_RE = /(\d+(?:\.\d+)?)\s*(kg|킬로그램|킬로|g|그램|ml|mL|밀리리터|밀리|리터|l|L)(?![a-zA-Z])/
const COUNT_RE = new RegExp(
    `(\\d+(?:\\.\\d+)?|\\d+\\/\\d+|하나|둘|셋|넷|다섯|여섯|한|두|세|석|네|반)\\s*(${COUNT_UNITS})(\\s*반)?`,
)
const BARE_NUMBER_RE = /(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/
const AMOUNT_STRIP_RE = new RegExp(`${COUNT_RE.source}|${GRAM_RE.source}|\\d+(?:\\.\\d+)?`, "g")
const FILLER_RE =
    /먹었어요|먹었어|먹었다|먹었음|먹음|먹고|마셨어요|마셨어|마셨다|마심|했어요|했어|정도|조금|약간|에는|에|을|를|은|는|이랑|랑|하고|와|과|도|으로|로/g

/** Chatter that is not a food; the real parser drops it too. */
const NOT_FOOD = new Set(["안녕", "안녕하세요", "테스트", "그냥", "많이", "맛있게", "배고파", "배불러", "오늘은", "뭐", "기록", "기록해줘", "추가", "추가해줘"])

interface ParsedAmount {
    /** Servings, used to scale the per-serving values. */
    servings: number
    amount: number
    unit: string
}

function parseNumber(token: string): number | null {
    if (token in KOREAN_NUM) return KOREAN_NUM[token]
    if (token.includes("/")) {
        const [n, d] = token.split("/").map(Number)
        return d ? n / d : null
    }
    const n = Number(token)
    return Number.isFinite(n) ? n : null
}

function parseAmount(text: string, servingG: number, defaultUnit: string): ParsedAmount | null {
    const gram = GRAM_RE.exec(text)
    if (gram) {
        const value = Number(gram[1])
        const unit = gram[2]
        const multiplier = /^(kg|킬로그램|킬로|리터|l|L)$/.test(unit) ? 1000 : 1
        const grams = value * multiplier
        if (grams > 0) {
            const isMl = /ml|mL|밀리|리터|^l$|^L$/.test(unit)
            return { servings: grams / servingG, amount: grams, unit: isMl ? "ml" : "g" }
        }
    }
    const count = COUNT_RE.exec(text)
    if (count) {
        const n = parseNumber(count[1])
        if (n != null && n > 0) {
            const total = n + (count[3] ? 0.5 : 0)
            return { servings: total, amount: total, unit: count[2] }
        }
    }
    const bare = BARE_NUMBER_RE.exec(text)
    if (bare) {
        const n = Number(bare[1])
        if (n > 0 && n <= 20) return { servings: n, amount: n, unit: defaultUnit }
    }
    return null
}

const round1 = (v: number) => Math.round(v * 10) / 10

function knownItem(f: DemoFood, amountText: string, mealType: MealType | null): ParseDietItem {
    const parsed = parseAmount(amountText, f.servingG, f.unit) ?? { servings: 1, amount: f.servingAmount, unit: f.unit }
    const s = parsed.servings
    return {
        food_name: f.name,
        amount: round1(parsed.amount),
        unit: parsed.unit,
        protein_g: round1(f.proteinG * s),
        carbs_g: round1(f.carbsG * s),
        fat_g: round1(f.fatG * s),
        kcal: Math.max(1, Math.round(f.kcal * s)),
        meal_type: mealType,
        time_of_day: null,
        source: "db",
    }
}

/** Mirrors the AI server, which leaves `source` null for LLM estimates; the page shows those as "AI 추정". */
function unknownItem(name: string, amountText: string, mealType: MealType | null): ParseDietItem {
    const parsed = parseAmount(amountText, UNKNOWN_SERVING.servingG, UNKNOWN_SERVING.unit) ?? {
        servings: 1,
        amount: 1,
        unit: UNKNOWN_SERVING.unit,
    }
    const s = parsed.servings
    return {
        food_name: name,
        amount: round1(parsed.amount),
        unit: parsed.unit,
        protein_g: round1(UNKNOWN_SERVING.proteinG * s),
        carbs_g: round1(UNKNOWN_SERVING.carbsG * s),
        fat_g: round1(UNKNOWN_SERVING.fatG * s),
        kcal: null,
        meal_type: mealType,
        time_of_day: null,
        source: null,
    }
}

/** What is left of a fragment once meal words, amounts and particles go; empty when nothing food-like remains. */
function leftoverFoodName(fragment: string): string {
    const cleaned = fragment
        .replace(MEAL_WORD_RE, " ")
        .replace(AMOUNT_STRIP_RE, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((word) => word.replace(new RegExp(`^(?:${FILLER_RE.source})+$`), "").replace(/(?:을|를|은|는|이랑|랑|하고|와|과|도|에|으로|로)$/, ""))
        .filter((word) => word.length > 0 && !new RegExp(`^(?:${FILLER_RE.source})$`).test(word))
        .join(" ")
        .trim()
    if (NOT_FOOD.has(cleaned.replace(/\s+/g, ""))) return ""
    return /\p{Script=Hangul}{2,}|[A-Za-z]{3,}/u.test(cleaned) ? cleaned : ""
}

function detectMeal(segment: string): MealType | null {
    for (const [re, meal] of MEAL_WORDS) if (re.test(segment)) return meal
    return null
}

interface Match {
    start: number
    end: number
    food: DemoFood
}

function findMatches(segment: string): Match[] {
    const taken: boolean[] = new Array(segment.length).fill(false)
    const matches: Match[] = []
    for (const { alias, food: f } of ALIASES) {
        let from = 0
        while (from <= segment.length - alias.length) {
            const idx = segment.indexOf(alias, from)
            if (idx < 0) break
            const end = idx + alias.length
            if (!taken.slice(idx, end).some(Boolean)) {
                for (let i = idx; i < end; i++) taken[i] = true
                matches.push({ start: idx, end, food: f })
            }
            from = end
        }
    }
    return matches.sort((a, b) => a.start - b.start)
}

const SEGMENT_SPLIT_RE = /[,，、+&\n;]|그리고|이랑|하고|및|랑/

export interface DemoParseDietResponse {
    items: ParseDietItem[]
    /** Names of foods outside the demo table, estimated roughly. */
    estimatedFoods: string[]
}

/** Deterministic stand-in for POST /api/ai/parse-diet. */
export function demoParseDiet(text: string): DemoParseDietResponse {
    const items: ParseDietItem[] = []
    const estimatedFoods: string[] = []
    let meal: MealType | null = null

    for (const raw of text.split(SEGMENT_SPLIT_RE)) {
        const segment = raw.trim()
        if (!segment) continue
        meal = detectMeal(segment) ?? meal

        const matches = findMatches(segment)
        if (matches.length === 0) {
            const name = leftoverFoodName(segment)
            if (name) {
                items.push(unknownItem(name, segment, meal))
                estimatedFoods.push(name)
            }
            continue
        }

        const before = leftoverFoodName(segment.slice(0, matches[0].start))
        if (before) {
            items.push(unknownItem(before, segment.slice(0, matches[0].start), meal))
            estimatedFoods.push(before)
        }
        matches.forEach((m, i) => {
            const next = matches[i + 1]?.start ?? segment.length
            let amountText = segment.slice(m.end, next)
            // "두 개 계란": amount written before the only food in the fragment.
            if (!parseAmount(amountText, m.food.servingG, m.food.unit) && i === 0 && !before) {
                amountText = segment.slice(0, m.start)
            }
            items.push(knownItem(m.food, amountText, meal))
        })
    }

    return { items, estimatedFoods }
}

export function demoQuicklogNotice(result: DemoParseDietResponse): string {
    const base = "데모 모드 예시 결과예요. 데모용 음식표로 계산했어요."
    if (result.estimatedFoods.length === 0) return base
    return `${base} ${result.estimatedFoods.map((n) => `"${n}"`).join(", ")}은(는) 대략 추정한 값이니 확인해 주세요.`
}

export { demoSupplementAnswer } from "./demoSupplementAi"
export type { DemoSupplementResponse } from "./demoSupplementAi"
