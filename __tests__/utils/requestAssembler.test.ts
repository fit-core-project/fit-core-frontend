import { describe, it, expect } from "vitest"
import { assembleRoutineRequest, RoutineFormState } from "../../utils/requestAssembler"

const baseState: RoutineFormState = {
    targetMuscles: ["chest", "triceps"],
    domsData: {},
    equipment: ["BARBELL", "DUMBBELL"],
    timeAvailable: 60,
    painAreas: [],
    goal: "hypertrophy",
    userNote: "",
    readinessLevel: "normal",
}

describe("assembleRoutineRequest — painAreas / DOMS cross-contamination", () => {
    it("pain area body parts must not appear in currentDoms", () => {
        const state: RoutineFormState = {
            ...baseState,
            painAreas: ["lower-back", "front-deltoids"],
            domsData: { chest: 1, quadriceps: 2 },
        }
        const req = assembleRoutineRequest(state)

        const domsBodyParts = req.currentDoms.map((d) => d.bodyPart)
        for (const painArea of req.currentPainAreas) {
            expect(domsBodyParts).not.toContain(painArea)
        }
    })

    it("DOMS body parts must not appear in currentPainAreas", () => {
        const state: RoutineFormState = {
            ...baseState,
            painAreas: ["lower-back"],
            domsData: { chest: 1, quadriceps: 2, hamstring: 1 },
        }
        const req = assembleRoutineRequest(state)

        const painAreaSet = new Set(req.currentPainAreas)
        for (const dom of req.currentDoms) {
            expect(painAreaSet.has(dom.bodyPart)).toBe(false)
        }
    })

    it("empty painAreas produces empty currentPainAreas regardless of DOMS", () => {
        const state: RoutineFormState = {
            ...baseState,
            painAreas: [],
            domsData: { chest: 2, gluteal: 1 },
        }
        const req = assembleRoutineRequest(state)
        expect(req.currentPainAreas).toHaveLength(0)
        expect(req.currentDoms.length).toBeGreaterThan(0)
    })

    it("empty domsData produces empty currentDoms regardless of painAreas", () => {
        const state: RoutineFormState = {
            ...baseState,
            painAreas: ["lower-back", "knees"],
            domsData: {},
        }
        const req = assembleRoutineRequest(state)
        expect(req.currentDoms).toHaveLength(0)
        expect(req.currentPainAreas.length).toBeGreaterThan(0)
    })

    it("DOMS level 0 entries are excluded from currentDoms", () => {
        const state: RoutineFormState = {
            ...baseState,
            domsData: { chest: 0, biceps: 1 },
        }
        const req = assembleRoutineRequest(state)
        const domsBodyParts = req.currentDoms.map((d) => d.bodyPart)
        expect(domsBodyParts).not.toContain("chest")
        expect(domsBodyParts).toContain("biceps")
    })

    it("DOMS level maps correctly: 1→mild, 2→moderate, 3→severe", () => {
        const state: RoutineFormState = {
            ...baseState,
            domsData: { chest: 1, lats: 2, legs: 3 },
        }
        const req = assembleRoutineRequest(state)
        const levelMap = Object.fromEntries(req.currentDoms.map((d) => [d.bodyPart, d.level]))
        expect(levelMap["chest"]).toBe("mild")
        expect(levelMap["lats"]).toBe("moderate")
        expect(levelMap["legs"]).toBe("severe")
    })
})
