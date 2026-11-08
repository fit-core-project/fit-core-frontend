import { describe, it, expect, vi, afterEach } from "vitest"
import { getKstToday, toYmd } from "../date"

afterEach(() => {
    vi.useRealTimers()
})

describe("getKstToday", () => {
    it("KST 자정 직후(UTC 전날 15:00)에 KST 날짜를 반환한다", () => {
        // 2026-07-04 00:00 KST = 2026-07-03T15:00:00.000Z
        vi.setSystemTime(new Date("2026-07-03T15:00:00.000Z"))
        expect(getKstToday()).toBe("2026-07-04")
    })

    it("KST 01:00(UTC 전날 16:00)에 KST 오늘 날짜를 반환한다 — 핵심 버그 케이스", () => {
        // 2026-07-04 01:00 KST = 2026-07-03T16:00:00.000Z
        // UTC 기준이면 "2026-07-03"(어제)가 나오지만 KST 기준은 "2026-07-04"여야 함
        vi.setSystemTime(new Date("2026-07-03T16:00:00.000Z"))
        expect(getKstToday()).toBe("2026-07-04")
    })

    it("UTC 자정 직후(KST 09:00)에도 KST 날짜를 반환한다", () => {
        // 2026-07-04 09:00 KST = 2026-07-04T00:00:00.000Z
        vi.setSystemTime(new Date("2026-07-04T00:00:00.000Z"))
        expect(getKstToday()).toBe("2026-07-04")
    })

    it("YYYY-MM-DD 형식을 반환한다", () => {
        vi.setSystemTime(new Date("2026-07-03T16:00:00.000Z"))
        expect(getKstToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
})

describe("toYmd", () => {
    it("로컬 자정 무렵의 Date도 UTC로 밀리지 않고 그날 날짜를 반환한다", () => {
        expect(toYmd(new Date(2026, 10, 8, 0, 30))).toBe("2026-11-08")
    })

    it("ISO 문자열은 날짜 부분만 남긴다", () => {
        expect(toYmd("2026-11-08")).toBe("2026-11-08")
        expect(toYmd("2026-11-08T23:59:00")).toBe("2026-11-08")
    })
})
