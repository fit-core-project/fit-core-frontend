import { describe, expect, it } from "vitest"
import type { RoutineFinalResponse } from "@/types/routine"
import {
    formatRoutineSavedDate,
    getRoutineProgramDisplay,
    moveSelectedRoutineIds,
} from "@/utils/routineProgramCreation"

function routine(overrides: Partial<RoutineFinalResponse> = {}): RoutineFinalResponse {
    return {
        routineFinalId: "final-1",
        routineDraftId: "draft-1",
        userId: "user-1",
        targetWorkoutDate: "2026-07-04",
        targetSplitLabel: "pull",
        finalRoutinePayload: {
            fallback: false,
            generationStatus: "success",
            statusReasonCode: "none",
            rationaleSummary: [],
            routineBlocks: [
                {
                    order: 1,
                    exerciseId: "lat-pulldown",
                    exerciseName: "랫풀다운",
                    exerciseRationale: "등 운동",
                    prescription: [],
                },
                {
                    order: 2,
                    exerciseId: "barbell-row",
                    exerciseName: "바벨로우",
                    exerciseRationale: "등 운동",
                    prescription: [],
                },
                {
                    order: 3,
                    exerciseId: "seated-row",
                    exerciseName: "시티드로우",
                    exerciseRationale: "등 운동",
                    prescription: [],
                },
                {
                    order: 4,
                    exerciseId: "curl",
                    exerciseName: "컬",
                    exerciseRationale: "팔 운동",
                    prescription: [],
                },
            ],
            summaryTitle: "Pull A",
            totalEstimatedTime: 45,
            warnings: [],
        },
        acceptedWithoutEdits: true,
        userEditSummary: [],
        savedAt: "2026-07-04T10:20:30",
        ...overrides,
    }
}

describe("routine program creation helpers", () => {
    it("moves selected routine ids by index", () => {
        expect(moveSelectedRoutineIds(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
        expect(moveSelectedRoutineIds(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
    })

    it("keeps ids unchanged for invalid moves", () => {
        const ids = ["a", "b"]
        expect(moveSelectedRoutineIds(ids, -1, 1)).toBe(ids)
        expect(moveSelectedRoutineIds(ids, 0, 9)).toBe(ids)
    })

    it("builds routine card display from payload", () => {
        expect(getRoutineProgramDisplay(routine())).toEqual({
            title: "Pull A",
            splitLabel: "당기기",
            exerciseCount: 4,
            exercisePreview: ["랫풀다운", "바벨로우", "시티드로우"],
            savedDateLabel: "2026.07.04 저장",
            estimatedTime: 45,
        })
    })

    it("falls back when title, split, date, and blocks are missing", () => {
        const display = getRoutineProgramDisplay(
            routine({
                targetSplitLabel: "",
                savedAt: "",
                finalRoutinePayload: {
                    ...routine().finalRoutinePayload,
                    summaryTitle: "",
                    totalEstimatedTime: 0,
                    routineBlocks: [],
                },
            })
        )

        expect(display.title).toBe("저장 루틴")
        expect(display.splitLabel).toBeNull()
        expect(display.exerciseCount).toBeNull()
        expect(display.exercisePreview).toEqual([])
        expect(display.savedDateLabel).toBeNull()
    })

    it("formats saved date safely", () => {
        expect(formatRoutineSavedDate("2026-07-04T10:20:30")).toBe("2026.07.04 저장")
        expect(formatRoutineSavedDate("not-a-date")).toBeNull()
        expect(formatRoutineSavedDate(null)).toBeNull()
    })
})
