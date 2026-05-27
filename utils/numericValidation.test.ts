import { describe, expect, it } from "vitest"
import { validateNumericRange } from "./numericValidation"

describe("numeric validation ranges", () => {
    it("rejects weight below/equal zero, above max, and negative values", () => {
        expect(validateNumericRange("weightKg", 0)).toBe("중량은 0kg 초과 500kg 이하로 입력해 주세요.")
        expect(validateNumericRange("weightKg", -1)).toBe("중량은 0kg 초과 500kg 이하로 입력해 주세요.")
        expect(validateNumericRange("weightKg", 500.1)).toBe("중량은 0kg 초과 500kg 이하로 입력해 주세요.")
        expect(validateNumericRange("weightKg", 500)).toBe(true)
    })

    it("rejects reps min-1, max+1, zero, negative, and non-integers", () => {
        expect(validateNumericRange("reps", 0)).toBe("반복 횟수는 1회 이상 50회 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("reps", 51)).toBe("반복 횟수는 1회 이상 50회 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("reps", -1)).toBe("반복 횟수는 1회 이상 50회 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("reps", 1.5)).toBe("반복 횟수는 1회 이상 50회 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("reps", 50)).toBe(true)
    })

    it("rejects rest below min, above max, negative, and non-integers while allowing zero", () => {
        expect(validateNumericRange("restSec", -1)).toBe("휴식 시간은 0초 이상 600초 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("restSec", 601)).toBe("휴식 시간은 0초 이상 600초 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("restSec", 1.5)).toBe("휴식 시간은 0초 이상 600초 이하의 정수로 입력해 주세요.")
        expect(validateNumericRange("restSec", 0)).toBe(true)
        expect(validateNumericRange("restSec", 600)).toBe(true)
    })

    it("rejects body composition boundary violations", () => {
        expect(validateNumericRange("bodyWeightKg", 19)).toBe("체중은 20kg 이상 300kg 이하로 입력해 주세요.")
        expect(validateNumericRange("bodyWeightKg", 301)).toBe("체중은 20kg 이상 300kg 이하로 입력해 주세요.")
        expect(validateNumericRange("bodyFatPct", 0)).toBe("체지방률은 1% 이상 60% 이하로 입력해 주세요.")
        expect(validateNumericRange("bodyFatPct", 61)).toBe("체지방률은 1% 이상 60% 이하로 입력해 주세요.")
        expect(validateNumericRange("skeletalMuscleMassKg", 4)).toBe("골격근량은 5kg 이상 100kg 이하로 입력해 주세요.")
        expect(validateNumericRange("skeletalMuscleMassKg", 101)).toBe("골격근량은 5kg 이상 100kg 이하로 입력해 주세요.")
    })
})
