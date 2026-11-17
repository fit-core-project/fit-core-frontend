import type { DietLogRequest } from "@/types/project"
import { kcalToSend, resolveDietKcal, type DietSource } from "@/utils/dietKcal"

/** Raw item from POST /api/ai/parse-diet (snake_case, AI contract). */
export interface ParseDietItem {
    food_name: string
    amount?: number | null
    unit?: string | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    meal_type?: string | null
    time_of_day?: string | null
    source?: DietSource | null
    kcal?: number | null
}

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const
export type MealType = (typeof MEAL_TYPES)[number]

/** Editable review row. `kcal` is an explicit value (DB kcal or user-typed); macros-only rows keep it null. */
export interface QuicklogDraftItem {
    key: string
    foodName: string
    amount: number | null
    unit: string | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    kcal: number | null
    source: DietSource
    mealType: string | null
    loggedAt: string | null
}

export type QuicklogDraftPatch = Partial<Pick<QuicklogDraftItem, "foodName" | "amount" | "unit" | "proteinG" | "carbsG" | "fatG" | "mealType">>

const GRAM_UNITS = new Set(["g", "gram", "grams", "그램", "그람"])
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Same upper bounds as BE DietLogRequest (`@Max`/`@DecimalMax`). */
export const DIET_LIMITS = { kcal: 5000, macroG: 1000, amountG: 5000 } as const

export function isGramUnit(unit: string | null | undefined): boolean {
    const trimmed = unit?.trim()
    return trimmed != null && trimmed !== "" && GRAM_UNITS.has(trimmed.toLowerCase())
}

export type DraftField = "amount" | "proteinG" | "carbsG" | "fatG" | "kcal"
export type DraftFieldErrors = Partial<Record<DraftField, string>>

/**
 * Per-field errors for values the backend would reject with 400.
 * Only checks what is actually sent: kcal as `kcalToSend` produces it, amount only when it goes out as `amountG`.
 */
export function draftItemErrors(item: QuicklogDraftItem): DraftFieldErrors {
    const errors: DraftFieldErrors = {}
    const sentKcal = kcalToSend(item.source, item.kcal)
    if (sentKcal != null && sentKcal > DIET_LIMITS.kcal) errors.kcal = `칼로리는 ${DIET_LIMITS.kcal.toLocaleString()}kcal까지 적을 수 있어요.`
    const macroMsg = `${DIET_LIMITS.macroG.toLocaleString()}g까지 적을 수 있어요.`
    if (item.proteinG != null && item.proteinG > DIET_LIMITS.macroG) errors.proteinG = macroMsg
    if (item.carbsG != null && item.carbsG > DIET_LIMITS.macroG) errors.carbsG = macroMsg
    if (item.fatG != null && item.fatG > DIET_LIMITS.macroG) errors.fatG = macroMsg
    if (item.amount != null && isGramUnit(item.unit) && item.amount > DIET_LIMITS.amountG) {
        errors.amount = `양은 ${DIET_LIMITS.amountG.toLocaleString()}g까지 적을 수 있어요.`
    }
    return errors
}

export function hasDraftItemErrors(item: QuicklogDraftItem): boolean {
    return Object.keys(draftItemErrors(item)).length > 0
}

/** First row that will be sent but breaks a backend bound; null when the batch is safe to send. */
export function firstInvalidDraftItem(items: QuicklogDraftItem[]): QuicklogDraftItem | null {
    return items.find((item) => isDraftItemSaveable(item) && hasDraftItemErrors(item)) ?? null
}

/** Save button label for the chosen date; `disabled` when the date is empty or in the future. */
export function quicklogSaveLabel(logDate: string, today: string): { label: string; disabled: boolean } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return { label: "날짜를 골라 주세요", disabled: true }
    if (logDate > today) return { label: "오늘 이후 날짜는 저장할 수 없어요", disabled: true }
    if (logDate === today) return { label: "식단 저장", disabled: false }
    return { label: `${Number(logDate.slice(5, 7))}월 ${Number(logDate.slice(8, 10))}일 식단으로 저장`, disabled: false }
}

function isMealType(value: string | null | undefined): value is MealType {
    return value != null && (MEAL_TYPES as readonly string[]).includes(value)
}

/** Meal by KST clock: 04~10 아침, 10~15 점심, 17~22 저녁, otherwise 간식. */
export function defaultMealTypeByKstHour(now: Date = new Date()): MealType {
    const hour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours()
    if (hour >= 4 && hour < 10) return "breakfast"
    if (hour >= 10 && hour < 15) return "lunch"
    if (hour >= 17 && hour < 22) return "dinner"
    return "snack"
}

export function toDraftItems(items: ParseDietItem[], fallbackMeal: MealType): QuicklogDraftItem[] {
    return items.map((item, idx) => {
        const source: DietSource = item.source === "db" || item.source === "manual" ? item.source : "ai"
        return {
            key: `item-${idx}-${item.food_name}`,
            foodName: item.food_name,
            amount: item.amount ?? null,
            unit: item.unit ?? null,
            proteinG: item.protein_g ?? null,
            carbsG: item.carbs_g ?? null,
            fatG: item.fat_g ?? null,
            // BE ignores kcal for ai rows; keep only meaningful explicit values.
            kcal: source === "ai" ? null : (item.kcal ?? null),
            source,
            mealType: isMealType(item.meal_type) ? item.meal_type : fallbackMeal,
            loggedAt: item.time_of_day && HH_MM.test(item.time_of_day) ? item.time_of_day : null,
        }
    })
}

/** kcal the backend will store for this row, or null when it would be rejected (no macros, no kcal). */
export function draftItemKcal(item: QuicklogDraftItem): number | null {
    return resolveDietKcal(item)
}

export function isDraftItemSaveable(item: QuicklogDraftItem): boolean {
    return item.foodName.trim() !== "" && draftItemKcal(item) != null
}

export function draftTotals(items: QuicklogDraftItem[]): { kcal: number; proteinG: number; carbsG: number; fatG: number } {
    const round1 = (v: number) => Math.round(v * 10) / 10
    const saveable = items.filter(isDraftItemSaveable)
    return {
        kcal: saveable.reduce((sum, item) => sum + (draftItemKcal(item) ?? 0), 0),
        proteinG: round1(saveable.reduce((sum, item) => sum + (item.proteinG ?? 0), 0)),
        carbsG: round1(saveable.reduce((sum, item) => sum + (item.carbsG ?? 0), 0)),
        fatG: round1(saveable.reduce((sum, item) => sum + (item.fatG ?? 0), 0)),
    }
}

/**
 * Applies a user edit. Any edit makes the row "manual" (BE ignores kcal for ai rows).
 * - `typedKcal` given: the user typed kcal explicitly → it wins.
 * - macros changed without typed kcal: drop the old explicit kcal so kcal follows the macros.
 */
export function applyDraftEdit(item: QuicklogDraftItem, patch: QuicklogDraftPatch, typedKcal?: number | null): QuicklogDraftItem {
    const next: QuicklogDraftItem = { ...item, ...patch, source: "manual" }
    if (typedKcal !== undefined) {
        next.kcal = typedKcal
        return next
    }
    const macrosChanged =
        (patch.proteinG !== undefined && patch.proteinG !== item.proteinG) ||
        (patch.carbsG !== undefined && patch.carbsG !== item.carbsG) ||
        (patch.fatG !== undefined && patch.fatG !== item.fatG)
    // A db row with kcal 0 used macros; as "manual" that 0 would win, so drop it too.
    // Same rule as kcalToSend (rounded first) so the edited row keeps the kcal the preview showed.
    const staleDbZero = item.source === "db" && item.kcal != null && kcalToSend("db", item.kcal) == null
    // An ai row's kcal was never used (BE ignores it); as "manual" it would win, so drop it.
    const ignoredAiKcal = item.source === "ai"
    if (macrosChanged || staleDbZero || ignoredAiKcal) next.kcal = null
    return next
}

export function draftItemToRequest(item: QuicklogDraftItem, logDate: string): DietLogRequest {
    const unit = item.unit?.trim() || null
    const isGram = isGramUnit(unit)
    return {
        logDate,
        mealType: item.mealType ?? null,
        loggedAt: item.loggedAt ?? null,
        foodName: item.foodName.trim(),
        amountG: isGram && item.amount != null ? item.amount : null,
        amountRaw: item.amount != null && unit ? `${item.amount}${unit}` : null,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        // Rounded, and null for ai / db rows without a usable kcal, so BE stores what the preview shows.
        kcal: kcalToSend(item.source, item.kcal),
        source: item.source,
    }
}

/** The meal every item shares (for the "apply to all" chips); null when mixed or empty. */
export function sharedMealType(items: QuicklogDraftItem[]): string | null {
    if (items.length === 0) return null
    const first = items[0].mealType
    return items.every((item) => item.mealType === first) ? first : null
}

/** Parses a numeric input; empty → null, invalid/negative → undefined (reject). */
export function parseOptionalNumber(value: string): number | null | undefined {
    const trimmed = value.trim()
    if (trimmed === "") return null
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n < 0) return undefined
    return n
}

/**
 * Index of the batch row a 400 response blames, when the backend names one
 * (field errors like `requests[2].kcal` or `saveBatch.requests[2].kcal`); null otherwise.
 */
export function rejectedDietItemIndex(err: unknown, count: number): number | null {
    const e = (err && typeof err === "object" ? err : {}) as { response?: { status?: number; data?: { message?: unknown } } | null }
    if (e.response?.status !== 400) return null
    const message = e.response.data?.message
    if (typeof message !== "string") return null
    const match = /\[(\d+)\]/.exec(message)
    if (!match) return null
    const index = Number(match[1])
    return index >= 0 && index < count ? index : null
}
