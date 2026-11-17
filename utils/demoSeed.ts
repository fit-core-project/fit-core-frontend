/**
 * Pure builders for the 테스트 모드 (demo login) seed. Every date is relative to the `today` passed in
 * (KST YYYY-MM-DD at seeding time), so a demo always looks current. Deterministic: no randomness.
 *
 * - Workouts: about the last 6 weeks, 3-5 sessions a week on a Push / Pull / Legs rotation, with warmups,
 *   progressive overload on working sets (so demoPrs shows recent PRs) and the occasional session note.
 * - Diet: the last 14 days including today, Korean foods from the demo quicklog table (DEMO_FOODS),
 *   each finished day near the demo kcal goal. Today holds only the meals eaten so far (no dinner yet).
 * - Body composition: a snapshot every 9-10 days, weight and body fat trending gently down.
 *
 * Exercise ids and names come from the mock catalog (services/mockDataFactory getMockExerciseCatalog);
 * muscle and pain values are SSOT slugs (utils/displayLabels).
 */
import type { BodyComposition, DietLogResponse, Doms, WorkoutSessionResponse, WorkoutSetResponse } from "@/types/project"
import type { MealType } from "@/utils/quicklogDraft"
import { DEMO_FOODS } from "@/utils/demoAi"

export const DEMO_USER_ID = "demo-user-001"

/** How far back the workout history and body-composition snapshots reach. */
export const DEMO_HISTORY_DAYS = 42
/** How many days of diet logs the seed holds, today included. */
export const DEMO_DIET_DAYS = 14

// ---------------------------------------------------------------------------
// Date helpers (UTC arithmetic on YYYY-MM-DD, so the runner's timezone cannot shift a day)
// ---------------------------------------------------------------------------

const toUtc = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
}
const DAY_MS = 86_400_000

export function addDays(ymd: string, days: number): string {
    return new Date(toUtc(ymd) + days * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
    return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/** 0 = Monday ... 6 = Sunday. */
const weekdayMon0 = (ymd: string) => (new Date(toUtc(ymd)).getUTCDay() + 6) % 7

/** ISO instant for a KST wall-clock time on `ymd`, plus `addMin` minutes. */
const kstInstant = (ymd: string, hour: number, minute: number, addMin = 0) =>
    new Date(toUtc(ymd) + ((hour - 9) * 60 + minute + addMin) * 60_000).toISOString().replace(".000Z", "Z")

const round1 = (n: number) => Math.round(n * 10) / 10
const roundTo = (n: number, step: number) => Math.round(n / step) * step

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export type DemoSplit = "push" | "pull" | "legs"

/** Main muscles each split works, used for DOMS. SSOT slugs. */
export const DEMO_SPLIT_MUSCLES: Record<DemoSplit, string[]> = {
    push: ["chest", "triceps", "front-deltoids"],
    pull: ["upper-back", "biceps"],
    legs: ["quadriceps", "gluteal", "hamstring"],
}

/** Workout weekdays (0 = Mon) by how many weeks back the week is (0 = this week). 3-5 days a week. */
const WEEK_PATTERNS: number[][] = [
    [0, 1, 3, 4, 5],
    [0, 2, 3, 5],
    [0, 1, 3, 5],
    [0, 2, 4],
    [0, 1, 3, 4, 6],
    [0, 2, 3, 5],
    [1, 3, 5],
]

interface ExercisePlan {
    exerciseId: string
    name: string
    /** Working weight of the first session of this split, and the gain per session. */
    baseKg: number
    stepKg: number
    /** Plate / dumbbell / stack increment the weight is rounded to. */
    roundKg: number
    workingReps: number[]
    restSec: number
    /** Warmup sets as fractions of the working weight. */
    warmups?: { ratio: number; reps: number }[]
    /** Last set after the working sets. */
    finisher?: "drop" | "failure"
    /** Only every other session of the split (k % 2 === 0). */
    everyOther?: boolean
}

/** Ids and Korean names from getMockExerciseCatalog (services/mockDataFactory). */
const SPLIT_PLANS: Record<DemoSplit, ExercisePlan[]> = {
    push: [
        {
            exerciseId: "ex_1", name: "벤치프레스", baseKg: 87.5, stepKg: 1.25, roundKg: 2.5, workingReps: [8, 7, 6], restSec: 180,
            warmups: [{ ratio: 0.45, reps: 10 }, { ratio: 0.7, reps: 5 }],
        },
        { exerciseId: "ex_11", name: "인클라인 덤벨 프레스", baseKg: 26, stepKg: 0.75, roundKg: 2, workingReps: [10, 9, 8], restSec: 90 },
        {
            exerciseId: "ex_6", name: "오버헤드프레스", baseKg: 50, stepKg: 1.25, roundKg: 2.5, workingReps: [6, 6, 5], restSec: 150,
            warmups: [{ ratio: 0.6, reps: 6 }], everyOther: true,
        },
        { exerciseId: "ex_12", name: "케이블 크로스오버", baseKg: 12.5, stepKg: 0.5, roundKg: 2.5, workingReps: [15, 12, 12], restSec: 60 },
        {
            exerciseId: "ex_10", name: "트라이셉스 푸시다운", baseKg: 22.5, stepKg: 1, roundKg: 2.5, workingReps: [12, 12, 10], restSec: 60,
            finisher: "drop",
        },
    ],
    pull: [
        {
            exerciseId: "ex_7", name: "바벨로우", baseKg: 70, stepKg: 1.25, roundKg: 2.5, workingReps: [8, 8, 7], restSec: 120,
            warmups: [{ ratio: 0.6, reps: 8 }],
        },
        { exerciseId: "ex_5", name: "랫풀다운", baseKg: 55, stepKg: 1.25, roundKg: 2.5, workingReps: [10, 10, 9], restSec: 90 },
        { exerciseId: "ex_9", name: "덤벨컬", baseKg: 12, stepKg: 0.5, roundKg: 2, workingReps: [12, 10, 10], restSec: 60, finisher: "failure" },
    ],
    legs: [
        {
            exerciseId: "ex_2", name: "스쿼트", baseKg: 120, stepKg: 2.5, roundKg: 2.5, workingReps: [6, 6, 5], restSec: 180,
            warmups: [{ ratio: 0.45, reps: 8 }, { ratio: 0.7, reps: 4 }],
        },
        {
            exerciseId: "ex_3", name: "데드리프트", baseKg: 140, stepKg: 2.5, roundKg: 2.5, workingReps: [5, 5], restSec: 180,
            warmups: [{ ratio: 0.6, reps: 5 }],
        },
        { exerciseId: "ex_8", name: "레그익스텐션", baseKg: 45, stepKg: 1.25, roundKg: 2.5, workingReps: [15, 12, 12], restSec: 75 },
    ],
}

const SPLIT_META: Record<DemoSplit, { splitLabel: string; routineName: string; timeAvailableMin: number }> = {
    push: { splitLabel: "Push - 가슴/어깨/삼두", routineName: "상부 가슴 볼륨업 루틴", timeAvailableMin: 75 },
    pull: { splitLabel: "Pull - 등/이두", routineName: "등 두께 강화 루틴", timeAvailableMin: 60 },
    legs: { splitLabel: "Legs - 스쿼트 중심", routineName: "스쿼트 중심 하체 근비대 루틴", timeAvailableMin: 75 },
}

const SESSION_NOTES: Record<DemoSplit, string[]> = {
    push: [
        "벤치 마지막 세트에서 팔꿈치가 벌어짐. 다음엔 그립 조금 좁게.",
        "어깨 불편감 없어서 오버헤드프레스 정상 진행.",
        "컨디션 좋음. 인클라인 덤벨 무게 한 칸 올려볼 만함.",
    ],
    pull: ["랫풀다운 때 견갑 하강 먼저 의식하니 등에 잘 들어옴.", "로우 반동 줄이고 템포 2초로 내림."],
    legs: ["허리 살짝 뻐근해서 데드리프트는 벨트 착용.", "스쿼트 깊이 좋았음. 무릎 컨디션 괜찮음."],
}

/** Workout days in the last DEMO_HISTORY_DAYS days, oldest first. Today is left for the active routine. */
export function demoWorkoutDates(today: string): string[] {
    const thisMonday = addDays(today, -weekdayMon0(today))
    const dates: string[] = []
    for (let weeksBack = WEEK_PATTERNS.length - 1; weeksBack >= 0; weeksBack--) {
        const monday = addDays(thisMonday, -7 * weeksBack)
        for (const weekday of WEEK_PATTERNS[weeksBack]) {
            const date = addDays(monday, weekday)
            const ago = daysBetween(date, today)
            if (ago >= 1 && ago <= DEMO_HISTORY_DAYS) dates.push(date)
        }
    }
    return dates
}

function buildSets(split: DemoSplit, k: number, sessionKey: string): WorkoutSetResponse[] {
    const sets: WorkoutSetResponse[] = []
    let order = 0
    const addSet = (plan: ExercisePlan, setIndex: number, setType: WorkoutSetResponse["setType"], weightKg: number, reps: number, rpe: number) => {
        sets.push({
            id: `demo-set-${sessionKey}-${sets.length + 1}`,
            exerciseOrder: order,
            exerciseId: plan.exerciseId,
            exerciseNameSnapshot: plan.name,
            setIndex,
            setType,
            trackingMode: "weightReps",
            weightKg,
            reps,
            rpe,
            rir: 10 - rpe,
            isFailure: setType === "failure",
            restSec: setType === "warmup" ? Math.min(plan.restSec, 90) : plan.restSec,
            setNote: setType === "drop" ? "드롭세트" : "",
        })
    }

    for (const plan of SPLIT_PLANS[split]) {
        if (plan.everyOther && k % 2 === 1) continue
        order += 1
        const working = roundTo(plan.baseKg + plan.stepKg * k, plan.roundKg)
        let setIndex = 0 // 1-based once incremented
        for (const warmup of plan.warmups ?? []) {
            addSet(plan, ++setIndex, "warmup", Math.max(plan.roundKg, roundTo(working * warmup.ratio, plan.roundKg)), warmup.reps, 6)
        }
        plan.workingReps.forEach((reps, i) => addSet(plan, ++setIndex, "working", working, reps, [7.5, 8, 8.5][i] ?? 8.5))
        if (plan.finisher === "drop") {
            addSet(plan, ++setIndex, "drop", Math.max(plan.roundKg, roundTo(working * 0.7, plan.roundKg)), 12, 9)
        } else if (plan.finisher === "failure") {
            addSet(plan, ++setIndex, "failure", working, 8, 10)
        }
    }
    return sets
}

/** About 6 weeks of sessions, newest first (the order the demo store keeps; a save prepends). */
export function buildDemoWorkouts(today: string): WorkoutSessionResponse[] {
    const rotation: DemoSplit[] = ["push", "pull", "legs"]
    const seen: Record<DemoSplit, number> = { push: 0, pull: 0, legs: 0 }
    let previous: { date: string; split: DemoSplit } | null = null

    const sessions = demoWorkoutDates(today).map((date, i) => {
        const split = rotation[i % rotation.length]
        const k = seen[split]++
        const meta = SPLIT_META[split]
        const sets = buildSets(split, k, date)
        const durationMin = meta.timeAvailableMin - 12 + ((i * 7) % 15)
        const morning = i % 4 === 1
        const createdAt = kstInstant(date, morning ? 7 : 19, morning ? 10 : 30)

        const currentPainAreas: string[] = []
        if (sets.some((s) => s.exerciseId === "ex_6")) currentPainAreas.push("front-deltoids")
        if (split === "legs" && k % 2 === 0) currentPainAreas.push("lower-back")

        const currentDoms: Doms[] =
            previous && daysBetween(previous.date, date) <= 1
                ? [{ bodyPart: DEMO_SPLIT_MUSCLES[previous.split][0], level: "mild" }]
                : []

        const notes = SESSION_NOTES[split]
        // every 4th session, so notes land on all three splits
        const sessionNote = i % 4 === 2 ? notes[Math.floor(i / 4) % notes.length] : ""
        previous = { date, split }

        return {
            id: `demo-workout-${date}`,
            userId: DEMO_USER_ID,
            workoutDate: date,
            splitLabel: meta.splitLabel,
            routineName: meta.routineName,
            targetSplitLabel: split,
            sourceRoutineFinalId: `demo-final-${date}`,
            timeAvailableMin: meta.timeAvailableMin,
            durationMin,
            readinessLevel: "normal",
            currentPainAreas,
            currentDoms,
            unavailableEquipment: [],
            sessionNote,
            createdAt,
            updatedAt: kstInstant(date, morning ? 7 : 19, morning ? 10 : 30, durationMin),
            sets,
        } satisfies WorkoutSessionResponse
    })

    return sessions.reverse()
}

/**
 * DOMS from the most recent sessions: worked yesterday (or today) -> level 2, two days ago -> level 1.
 * Uses the session's targetSplitLabel; sessions without one add nothing.
 */
export function demoDomsFromSessions(sessions: WorkoutSessionResponse[], today: string): Partial<Record<string, 1 | 2>> {
    const doms: Partial<Record<string, 1 | 2>> = {}
    for (const session of sessions) {
        const ago = daysBetween(String(session.workoutDate).slice(0, 10), today)
        if (ago < 0 || ago > 2) continue
        const level: 1 | 2 = ago <= 1 ? 2 : 1
        const muscles = DEMO_SPLIT_MUSCLES[(session.targetSplitLabel ?? "").toLowerCase() as DemoSplit] ?? []
        for (const muscle of muscles) {
            if ((doms[muscle] ?? 0) < level) doms[muscle] = level
        }
    }
    return doms
}

// ---------------------------------------------------------------------------
// Diet
// ---------------------------------------------------------------------------

type MealPlan = Partial<Record<MealType, [food: string, servings: number][]>>

/** One day each; every full day lands within 90-110% of the 2,000 kcal demo goal. */
const DAY_MENUS: MealPlan[] = [
    {
        breakfast: [["오트밀", 1.5], ["바나나", 1], ["프로틴 쉐이크", 1]],
        lunch: [["잡곡밥", 1], ["제육볶음", 1], ["김치", 1]],
        snack: [["그릭요거트", 1], ["아몬드", 1]],
        dinner: [["현미밥", 1], ["연어", 1.5], ["샐러드", 1]],
    },
    {
        breakfast: [["식빵", 2], ["계란후라이", 2], ["우유", 1]],
        lunch: [["비빔밥", 1], ["미역국", 1]],
        snack: [["프로틴 쉐이크", 1], ["사과", 1]],
        dinner: [["쌀밥", 1], ["닭가슴살", 1.5], ["된장찌개", 1], ["김치", 1]],
    },
    {
        breakfast: [["삶은 달걀", 3], ["고구마", 1], ["아메리카노", 1]],
        lunch: [["김밥", 1], ["순두부찌개", 1]],
        snack: [["프로틴 쉐이크", 1], ["바나나", 1]],
        dinner: [["잡곡밥", 1], ["소고기", 1], ["샐러드", 1]],
    },
    {
        breakfast: [["그릭요거트", 2], ["오트밀", 1], ["바나나", 1]],
        lunch: [["현미밥", 1], ["불고기", 1], ["김치", 1]],
        snack: [["카페라떼", 1], ["아몬드", 1]],
        dinner: [["쌀밥", 1], ["고등어구이", 1], ["미역국", 1]],
    },
    {
        breakfast: [["샌드위치", 1], ["아메리카노", 1]],
        lunch: [["닭가슴살 샐러드", 1], ["고구마", 2]],
        snack: [["프로틴 쉐이크", 1], ["삶은 달걀", 2]],
        dinner: [["잡곡밥", 1], ["김치찌개", 1], ["두부", 0.5], ["계란후라이", 1]],
    },
    {
        breakfast: [["식빵", 2], ["계란후라이", 2], ["아메리카노", 1]],
        lunch: [["칼국수", 1], ["김치", 1]],
        snack: [["프로틴 쉐이크", 1]],
        dinner: [["삼겹살", 1], ["쌀밥", 1]],
    },
    {
        breakfast: [["오트밀", 1], ["우유", 1], ["바나나", 1]],
        lunch: [["쌀밥", 1], ["제육볶음", 1]],
        snack: [["그릭요거트", 1], ["사과", 1]],
        dinner: [["현미밥", 1], ["닭가슴살", 2], ["된장찌개", 1]],
    },
]

const MEAL_TIMES: Record<MealType, [hour: number, minute: number]> = {
    breakfast: [7, 40],
    lunch: [12, 20],
    snack: [16, 0],
    dinner: [19, 30],
}
const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"]
/** Meals already eaten when today's log is seeded; dinner is left for the demo user to add. */
const TODAY_MEALS: MealType[] = ["breakfast", "lunch", "snack"]

const pad2 = (n: number) => String(n).padStart(2, "0")
const formatServings = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Diet logs for the last DEMO_DIET_DAYS days including today, oldest first. */
export function buildDemoDietLogs(today: string): DietLogResponse[] {
    const foods = new Map(DEMO_FOODS.map((f) => [f.name, f]))
    const logs: DietLogResponse[] = []
    for (let ago = DEMO_DIET_DAYS - 1; ago >= 0; ago--) {
        const date = addDays(today, -ago)
        const menu = DAY_MENUS[ago % DAY_MENUS.length]
        const meals = ago === 0 ? TODAY_MEALS : MEAL_ORDER
        let n = 0
        for (const mealType of meals) {
            const [hour, minute] = MEAL_TIMES[mealType]
            ;(menu[mealType] ?? []).forEach(([name, servings], i) => {
                const f = foods.get(name)
                if (!f) throw new Error(`demo food not in DEMO_FOODS: ${name}`)
                n += 1
                logs.push({
                    id: `demo-diet-${date}-${pad2(n)}`,
                    userId: DEMO_USER_ID,
                    logDate: date,
                    mealType,
                    loggedAt: `${date}T${pad2(hour)}:${pad2(minute + i)}:00`,
                    foodName: f.name,
                    amountG: Math.round(f.servingG * servings),
                    amountRaw: `${formatServings(servings)}${f.unit}`,
                    kcal: Math.round(f.kcal * servings),
                    proteinG: round1(f.proteinG * servings),
                    carbsG: round1(f.carbsG * servings),
                    fatG: round1(f.fatG * servings),
                    source: "db",
                })
            })
        }
    }
    return logs
}

// ---------------------------------------------------------------------------
// Body composition
// ---------------------------------------------------------------------------

/** Oldest to newest: [days ago, weight, body fat %, skeletal muscle, waist-hip ratio, visceral fat level]. */
const BODY_TREND: [number, number, number, number, number, number][] = [
    [41, 84.2, 16.9, 37.6, 0.88, 7],
    [31, 83.7, 16.3, 37.8, 0.87, 7],
    [22, 83.3, 15.8, 38.1, 0.86, 6],
    [12, 82.9, 15.3, 38.3, 0.86, 6],
    [2, 82.5, 14.9, 38.6, 0.85, 5],
]

/** Snapshots every 9-10 days over the history window, newest first. */
export function buildDemoBodyComposition(today: string): BodyComposition[] {
    return BODY_TREND.map(([ago, weight, pct, smm, whr, visceral]) => {
        const fatMass = round1((weight * pct) / 100)
        return {
            measuredAt: addDays(today, -ago),
            source: "manual",
            sourceVendor: "demo",
            bodyWeightKg: weight,
            skeletalMuscleMassKg: smm,
            bodyFatMassKg: fatMass,
            bodyFatPct: pct,
            fatFreeMassKg: round1(weight - fatMass),
            waistHipRatio: whr,
            visceralFatLevel: visceral,
        }
    }).reverse()
}
