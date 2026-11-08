import { describe, expect, it } from "vitest"
import {
    equipmentLabel,
    fallbackReasonLabel,
    mealLabel,
    muscleLabel,
    routineOriginLabel,
    splitLabel,
    splitTitle,
} from "@/utils/displayLabels"

const PAIN_SLUGS = [
    "abductors", "abs", "adductor", "back-deltoids", "biceps", "calves", "chest", "forearm", "front-deltoids",
    "gluteal", "hamstring", "head", "knees", "left-soleus", "lower-back", "neck", "obliques", "quadriceps",
    "right-soleus", "trapezius", "triceps", "upper-back",
]

const SPLITS = ["push", "pull", "legs", "upper", "chest_back", "lower", "chest", "back", "shoulder", "arm", "core", "neck", "full_body", "custom"]

const EQUIPMENT = ["BAND", "BARBELL", "BODYWEIGHT", "CABLE", "DUMBBELL", "KETTLEBELL", "LANDMINE", "MACHINE", "PLATE", "SMITH_MACHINE"]

const HANGUL = /[가-힣]/

describe("display labels", () => {
    it("labels every SSOT pain slug plus the side-deltoids detail in Korean", () => {
        for (const slug of [...PAIN_SLUGS, "side-deltoids"]) {
            expect(muscleLabel(slug), slug).toMatch(HANGUL)
            expect(muscleLabel(slug)).not.toBe("기타 부위")
        }
    })

    it("labels every contract split and equipment code", () => {
        for (const split of SPLITS) expect(splitLabel(split), split).not.toBe("루틴")
        for (const code of EQUIPMENT) expect(equipmentLabel(code), code).not.toBe("기타 장비")
        expect(equipmentLabel("smith_machine")).toBe("스미스 머신")
    })

    it("never echoes an unknown code back to the screen", () => {
        expect(muscleLabel("CHEST_MID")).toBe("기타 부위")
        expect(splitLabel("ppl")).toBe("루틴")
        expect(equipmentLabel("BOX")).toBe("기타 장비")
        expect(mealLabel("brunch")).toBe("기타")
    })

    it("says nothing for a successful status and explains fallbacks", () => {
        expect(fallbackReasonLabel("none")).toBeNull()
        expect(fallbackReasonLabel(undefined)).toBeNull()
        expect(fallbackReasonLabel("llmTimeout")).toMatch(HANGUL)
        expect(fallbackReasonLabel("ai_connection_refused")).toBe(fallbackReasonLabel("networkError"))
    })

    it("builds titles from split fields without leaking codes", () => {
        expect(splitTitle("push")).toBe("밀기 루틴")
        expect(splitTitle(" FULL_BODY ")).toBe("전신 루틴")
        expect(splitTitle("Push — 상부 흉근 집중")).toBe("Push — 상부 흉근 집중")
        expect(splitTitle("ppl_v2")).toBeNull()
        expect(splitTitle("")).toBeNull()
    })

    it("names the routine origin", () => {
        expect(routineOriginLabel({})).toBe("AI 추천 루틴")
        expect(routineOriginLabel({ isFallback: true })).toBe("기본 규칙 루틴")
        expect(routineOriginLabel({ isManual: true, isFallback: true })).toBe("직접 작성")
    })
})
