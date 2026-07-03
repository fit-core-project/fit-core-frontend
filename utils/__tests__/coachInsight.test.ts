import { describe, expect, it, test } from "vitest"
import { deriveCoachState, LOW_ATTENDANCE_THRESHOLD } from "../coachInsight"
import type { CoachSignals, CoachStateId } from "../../types/coach"

const BASE: CoachSignals = {
    equipmentEmpty: false,
    finalsTotal: 1,
    kcalGoal: 2000,
    totalKcal: 1500,
    todayWorkoutDone: false,
    todayDietLogged: false,
    weeklyRate: 0.8,
    actualDays: 4,
    targetDays: 5,
}

// ─── Layer 1: 상태 커버리지 (8 케이스) ───────────────────────────────────────

const stateCoverage: Array<[string, CoachSignals, CoachStateId]> = [
    ["NO_EQUIPMENT: equipmentEmpty=true", { ...BASE, equipmentEmpty: true }, "NO_EQUIPMENT"],
    ["NO_ROUTINE: finalsTotal=0", { ...BASE, finalsTotal: 0 }, "NO_ROUTINE"],
    ["NO_KCAL_GOAL: kcalGoal null", { ...BASE, kcalGoal: null }, "NO_KCAL_GOAL"],
    [
        "WORKOUT_DONE_NO_DIET: 운동 완료, 식단 없음",
        { ...BASE, todayWorkoutDone: true, todayDietLogged: false },
        "WORKOUT_DONE_NO_DIET",
    ],
    [
        "WORKOUT_DONE_DIET_OVER: 운동 완료, 칼로리 초과",
        { ...BASE, todayWorkoutDone: true, todayDietLogged: true, totalKcal: 2500, kcalGoal: 2000 },
        "WORKOUT_DONE_DIET_OVER",
    ],
    [
        "WORKOUT_DONE_DIET_OK: 운동 완료, 목표 안",
        { ...BASE, todayWorkoutDone: true, todayDietLogged: true, totalKcal: 1800, kcalGoal: 2000 },
        "WORKOUT_DONE_DIET_OK",
    ],
    [
        "NO_WORKOUT_DIET_LOGGED: 식단 있음, 운동 없음",
        { ...BASE, todayWorkoutDone: false, todayDietLogged: true },
        "NO_WORKOUT_DIET_LOGGED",
    ],
    [
        "LOW_ATTENDANCE: 운동X, 식단X, 수행률 낮음",
        { ...BASE, todayWorkoutDone: false, todayDietLogged: false, weeklyRate: 0.4, actualDays: 2, targetDays: 5 },
        "LOW_ATTENDANCE",
    ],
    [
        "TODAY_NOT_STARTED: 운동X, 식단X, 수행률 정상",
        { ...BASE, todayWorkoutDone: false, todayDietLogged: false, weeklyRate: 0.8 },
        "TODAY_NOT_STARTED",
    ],
]

describe("Layer 1 — 상태 커버리지", () => {
    test.each(stateCoverage)("%s", (_label, signals, expected) => {
        expect(deriveCoachState(signals).stateId).toBe(expected)
    })
})

// ─── Layer 2: 우선순위 경계 (6 케이스) ──────────────────────────────────────

describe("Layer 2 — 우선순위 경계", () => {
    it("equipmentEmpty=true + finalsTotal=0 → NO_EQUIPMENT이 이김 (장비가 루틴보다 위)", () => {
        expect(
            deriveCoachState({ ...BASE, equipmentEmpty: true, finalsTotal: 0 }).stateId
        ).toBe("NO_EQUIPMENT")
    })

    it("finalsTotal=0 + kcalGoal null → NO_ROUTINE이 이김", () => {
        expect(
            deriveCoachState({ ...BASE, finalsTotal: 0, kcalGoal: null }).stateId
        ).toBe("NO_ROUTINE")
    })

    it("kcalGoal null + 운동 완료 + 식단 있음 → NO_KCAL_GOAL이 이김", () => {
        expect(
            deriveCoachState({
                ...BASE,
                kcalGoal: null,
                todayWorkoutDone: true,
                todayDietLogged: true,
            }).stateId
        ).toBe("NO_KCAL_GOAL")
    })

    it("운동X + 식단X + weeklyRate 0.4 → LOW_ATTENDANCE (죽은 코드 아님 확인)", () => {
        expect(
            deriveCoachState({
                ...BASE,
                todayWorkoutDone: false,
                todayDietLogged: false,
                weeklyRate: 0.4,
            }).stateId
        ).toBe("LOW_ATTENDANCE")
    })

    it("운동X + 식단X + weeklyRate 0.8 → TODAY_NOT_STARTED", () => {
        expect(
            deriveCoachState({
                ...BASE,
                todayWorkoutDone: false,
                todayDietLogged: false,
                weeklyRate: 0.8,
            }).stateId
        ).toBe("TODAY_NOT_STARTED")
    })

    it("운동 완료 + 식단X + 수행률 낮음 → WORKOUT_DONE_NO_DIET (오늘이 이김)", () => {
        expect(
            deriveCoachState({
                ...BASE,
                todayWorkoutDone: true,
                todayDietLogged: false,
                weeklyRate: 0.3,
            }).stateId
        ).toBe("WORKOUT_DONE_NO_DIET")
    })

    it("운동X + 식단 있음 + 수행률 낮음 → NO_WORKOUT_DIET_LOGGED", () => {
        expect(
            deriveCoachState({
                ...BASE,
                todayWorkoutDone: false,
                todayDietLogged: true,
                weeklyRate: 0.3,
            }).stateId
        ).toBe("NO_WORKOUT_DIET_LOGGED")
    })
})

// ─── Layer 3: 숫자 포맷 정확도 (4 케이스) ────────────────────────────────────

describe("Layer 3 — 숫자 포맷 정확도", () => {
    it("OVER: 2320-2000=320 → message에 '320kcal 더' 포함", () => {
        const result = deriveCoachState({
            ...BASE,
            todayWorkoutDone: true,
            todayDietLogged: true,
            totalKcal: 2320,
            kcalGoal: 2000,
        })
        expect(result.stateId).toBe("WORKOUT_DONE_DIET_OVER")
        expect(result.message).toContain("320kcal 더")
    })

    it("OK: message에 '1,850/2,000kcal' 포함", () => {
        const result = deriveCoachState({
            ...BASE,
            todayWorkoutDone: true,
            todayDietLogged: true,
            totalKcal: 1850,
            kcalGoal: 2000,
        })
        expect(result.stateId).toBe("WORKOUT_DONE_DIET_OK")
        expect(result.message).toContain("1,850/2,000kcal")
    })

    it("LOW: message에 '2번' 및 '목표 5번' 포함", () => {
        const result = deriveCoachState({
            ...BASE,
            todayWorkoutDone: false,
            todayDietLogged: false,
            weeklyRate: 0.4,
            actualDays: 2,
            targetDays: 5,
        })
        expect(result.stateId).toBe("LOW_ATTENDANCE")
        expect(result.message).toContain("2번")
        expect(result.message).toContain("목표 5번")
    })

    it("OK null fallback: totalKcal null → 'null'/'NaN' 미노출", () => {
        const result = deriveCoachState({
            ...BASE,
            todayWorkoutDone: true,
            todayDietLogged: true,
            totalKcal: null,
            kcalGoal: 2000,
        })
        expect(result.stateId).toBe("WORKOUT_DONE_DIET_OK")
        expect(result.message).not.toContain("null")
        expect(result.message).not.toContain("NaN")
    })
})

// ─── Meta: 죽은 코드 회귀 가드 ───────────────────────────────────────────────

describe("Meta — 죽은 코드 가드", () => {
    it("Layer 1의 expected 값이 9개 CoachStateId를 전부 커버함", () => {
        const ALL_STATE_IDS: CoachStateId[] = [
            "NO_EQUIPMENT",
            "NO_ROUTINE",
            "NO_KCAL_GOAL",
            "WORKOUT_DONE_NO_DIET",
            "WORKOUT_DONE_DIET_OVER",
            "WORKOUT_DONE_DIET_OK",
            "NO_WORKOUT_DIET_LOGGED",
            "LOW_ATTENDANCE",
            "TODAY_NOT_STARTED",
        ]
        const covered = new Set(stateCoverage.map(([, , stateId]) => stateId))
        for (const id of ALL_STATE_IDS) {
            expect(covered.has(id), `${id} not covered in Layer 1`).toBe(true)
        }
        expect(covered.size).toBe(9)
    })

    it("LOW_ATTENDANCE_THRESHOLD 상수가 0.6임", () => {
        expect(LOW_ATTENDANCE_THRESHOLD).toBe(0.6)
    })
})
