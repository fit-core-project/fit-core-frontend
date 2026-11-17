import { afterEach, describe, expect, it, vi } from "vitest"
import {
    DEMO_DIET_DAYS,
    DEMO_HISTORY_DAYS,
    addDays,
    buildDemoBodyComposition,
    buildDemoDietLogs,
    buildDemoWorkouts,
    daysBetween,
    demoDomsFromSessions,
} from "@/utils/demoSeed"
import { demoAttendance, demoPrs } from "@/utils/demoWorkoutStats"
import { validateNumericRange } from "@/utils/numericValidation"
import { validateBodyComposition } from "@/app/my/body-composition/bodyCompositionValidation"
import { DIET_LIMITS, MEAL_TYPES } from "@/utils/quicklogDraft"
import { kcalTargetRange } from "@/utils/nutritionGoal"
import { getMockExerciseCatalog } from "@/services/mockDataFactory"
import { PAIN_AREA_SLUGS, TRAINABLE_MUSCLE_SLUGS } from "@/utils/displayLabels"

// Every weekday, so the weekly patterns are covered from each starting point.
const TODAYS = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2027-03-01"]
const ymd = (value: string | Date) => String(value).slice(0, 10)

describe.each(TODAYS)("demo seed relative to %s", (today) => {
    const workouts = buildDemoWorkouts(today)
    const diets = buildDemoDietLogs(today)
    const body = buildDemoBodyComposition(today)

    it("keeps every date recent and never in the future", () => {
        for (const s of workouts) {
            const ago = daysBetween(ymd(s.workoutDate), today)
            expect(ago).toBeGreaterThanOrEqual(1)
            expect(ago).toBeLessThanOrEqual(DEMO_HISTORY_DAYS)
        }
        for (const d of diets) {
            const ago = daysBetween(d.logDate, today)
            expect(ago).toBeGreaterThanOrEqual(0)
            expect(ago).toBeLessThan(DEMO_DIET_DAYS)
        }
        for (const b of body) {
            const ago = daysBetween(b.measuredAt!, today)
            expect(ago).toBeGreaterThanOrEqual(0)
            expect(ago).toBeLessThanOrEqual(DEMO_HISTORY_DAYS)
        }
        // the latest session is at most 2 days old
        expect(daysBetween(ymd(workouts[0].workoutDate), today)).toBeLessThanOrEqual(2)
    })

    it("seeds 3-5 sessions in each full week, newest first, one per day", () => {
        const dates = workouts.map((s) => ymd(s.workoutDate))
        expect([...dates].sort().reverse()).toEqual(dates)
        expect(new Set(dates).size).toBe(dates.length)
        const weeks = demoAttendance(workouts, today, 4)
        for (const week of weeks.slice(0, 3)) {
            expect(week.actualDays).toBeGreaterThanOrEqual(3)
            expect(week.actualDays).toBeLessThanOrEqual(5)
        }
        expect(weeks.reduce((sum, w) => sum + w.actualDays, 0)).toBeGreaterThan(0)
        expect(workouts.length).toBeGreaterThanOrEqual(6 * 3)
    })

    it("has non-empty PRs set in the last two weeks", () => {
        const prs = demoPrs(workouts)
        expect(prs.length).toBeGreaterThanOrEqual(8)
        expect(daysBetween(prs[0].achievedDate, today)).toBeLessThanOrEqual(14)
        const bench = prs.find((p) => p.exerciseId === "ex_1")!
        const firstBench = workouts[workouts.length - 1].sets.find((s) => s.exerciseId === "ex_1" && s.setType === "working")!
        expect(bench.weightKg).toBeGreaterThan(firstBench.weightKg)
    })

    it("passes the workout set validators and uses catalog exercises and SSOT slugs", () => {
        const catalog = new Map(getMockExerciseCatalog().map((e) => [e.id, e.nameKr]))
        const muscles = new Set<string>(TRAINABLE_MUSCLE_SLUGS)
        const pains = new Set<string>(PAIN_AREA_SLUGS)
        const setTypes = new Set<string>()
        for (const s of workouts) {
            expect(s.sets.length).toBeGreaterThan(0)
            expect(["push", "pull", "legs"]).toContain(s.targetSplitLabel)
            s.currentPainAreas.forEach((a) => expect(pains.has(a)).toBe(true))
            s.currentDoms.forEach((d) => expect(muscles.has(d.bodyPart!)).toBe(true))
            const perExercise = new Map<string, number[]>()
            for (const set of s.sets) {
                setTypes.add(set.setType)
                expect(catalog.get(set.exerciseId)).toBe(set.exerciseNameSnapshot)
                expect(validateNumericRange("weightKg", set.weightKg)).toBe(true)
                expect(validateNumericRange("reps", set.reps)).toBe(true)
                expect(validateNumericRange("restSec", set.restSec)).toBe(true)
                expect(set.rir).toBe(10 - set.rpe)
                perExercise.set(set.exerciseId, [...(perExercise.get(set.exerciseId) ?? []), set.setIndex])
            }
            // setIndex is 1-based and contiguous per exercise
            perExercise.forEach((indexes) => expect(indexes).toEqual(indexes.map((_, i) => i + 1)))
        }
        expect(setTypes).toEqual(new Set(["warmup", "working", "drop", "failure"]))
        const noted = workouts.filter((s) => s.sessionNote)
        expect(noted.length).toBeGreaterThan(0)
        expect(noted.length).toBeLessThan(workouts.length)
        expect(new Set(noted.map((s) => s.targetSplitLabel)).size).toBeGreaterThan(1)
    })

    it("seeds Korean diet logs within BE limits and near the kcal goal", () => {
        const range = kcalTargetRange(2000)!
        expect(new Set(diets.map((d) => d.id)).size).toBe(diets.length)
        for (const d of diets) {
            expect(MEAL_TYPES).toContain(d.mealType)
            expect(d.foodName).toMatch(/[가-힣]/)
            expect(d.kcal).toBeGreaterThan(0)
            expect(d.kcal).toBeLessThanOrEqual(DIET_LIMITS.kcal)
            for (const g of [d.proteinG, d.carbsG, d.fatG]) expect(g!).toBeLessThanOrEqual(DIET_LIMITS.macroG)
            expect(d.amountG!).toBeLessThanOrEqual(DIET_LIMITS.amountG)
        }
        for (let ago = 1; ago < DEMO_DIET_DAYS; ago++) {
            const day = diets.filter((d) => d.logDate === addDays(today, -ago))
            expect(new Set(day.map((d) => d.mealType))).toEqual(new Set(MEAL_TYPES))
            const kcal = day.reduce((sum, d) => sum + d.kcal, 0)
            expect(kcal).toBeGreaterThanOrEqual(range.min)
            expect(kcal).toBeLessThanOrEqual(range.max)
        }
        const todayMeals = new Set(diets.filter((d) => d.logDate === today).map((d) => d.mealType))
        expect(todayMeals.has("breakfast") && todayMeals.has("lunch")).toBe(true)
    })

    it("seeds body composition every 1-2 weeks that passes the validators and trends down", () => {
        expect(body.length).toBeGreaterThanOrEqual(4)
        for (let i = 0; i < body.length; i++) {
            const b = body[i]
            expect(validateBodyComposition(b, "kg", today)).toEqual({})
            expect(validateNumericRange("bodyWeightKg", b.bodyWeightKg)).toBe(true)
            expect(validateNumericRange("bodyFatPct", b.bodyFatPct)).toBe(true)
            expect(validateNumericRange("skeletalMuscleMassKg", b.skeletalMuscleMassKg)).toBe(true)
            if (i > 0) {
                const gap = daysBetween(body[i].measuredAt!, body[i - 1].measuredAt!)
                expect(gap).toBeGreaterThanOrEqual(7)
                expect(gap).toBeLessThanOrEqual(14)
                expect(body[i - 1].bodyWeightKg!).toBeLessThan(body[i].bodyWeightKg!)
                expect(body[i - 1].bodyFatPct!).toBeLessThan(body[i].bodyFatPct!)
            }
        }
    })
})

describe("demo seed is relative, not fixed", () => {
    it("shifts every date with today", () => {
        const a = buildDemoWorkouts("2026-11-17").map((s) => ymd(s.workoutDate))
        const b = buildDemoWorkouts("2026-11-24").map((s) => ymd(s.workoutDate))
        expect(b).toEqual(a.map((d) => addDays(d, 7)))
        expect(buildDemoDietLogs("2026-12-01")[0].logDate).toBe(addDays(buildDemoDietLogs("2026-11-17")[0].logDate, 14))
        expect(buildDemoBodyComposition("2027-01-10")[0].measuredAt).toBe(addDays(buildDemoBodyComposition("2026-11-17")[0].measuredAt!, 54))
    })

    it("derives DOMS from session dates", () => {
        const sessions = buildDemoWorkouts("2026-11-18") // Tue 11-17 and Mon 11-16 are workout days
        const doms = demoDomsFromSessions(sessions, "2026-11-18")
        expect(Object.keys(doms).length).toBeGreaterThan(0)
        expect(Object.values(doms)).toContain(2)
        expect(demoDomsFromSessions(sessions, "2027-01-01")).toEqual({})
    })
})

describe("seedDemoSession", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it("stores the bumped version and data built from the current KST date", async () => {
        const store = new Map<string, string>()
        const local = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
        }
        vi.stubGlobal("localStorage", local)
        vi.stubGlobal("window", { localStorage: local })
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-11-17T20:00:00Z")) // 2026-11-18 05:00 KST

        const { DEMO_DATA_VERSION, seedDemoSession, getDemoProfile, getDemoRecentWorkouts, getDemoDietLogs } = await import(
            "@/utils/demoMode"
        )
        expect(DEMO_DATA_VERSION).not.toBe("2026-05-21-demo-v3")

        store.set("fitcore_demo_data_version", "2026-05-21-demo-v3")
        store.set("fitcore_demo_workouts", "[]")
        const profile = getDemoProfile() // an old version reseeds
        expect(store.get("fitcore_demo_data_version")).toBe(DEMO_DATA_VERSION)
        expect(profile.bodyCompositionSnapshot?.[0].measuredAt).toBe("2026-11-16")
        expect(profile.bodyWeightKg).toBe(profile.bodyCompositionSnapshot?.[0].bodyWeightKg)
        expect(profile.painAreas.map((p) => p.area)).toEqual(["front-deltoids", "lower-back"])
        expect(profile.goalType).toBe("hypertrophy")

        seedDemoSession()
        const workouts = getDemoRecentWorkouts(0, 100).content
        expect(workouts.length).toBeGreaterThan(18)
        expect(ymd(workouts[0].workoutDate) < "2026-11-18").toBe(true)
        expect(getDemoDietLogs("2026-11-18").length).toBeGreaterThan(0)
        expect(JSON.parse(store.get("fitcore_pain_areas")!)).toEqual(["front-deltoids", "lower-back"])
    })
})
