import { describe, expect, it } from "vitest"
import {
    AI_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    aiRequestConfig,
    isAuthExpiredError,
    isCanceledError,
    isTimeoutError,
    isWorkoutSaveRequest,
    timeoutFor,
} from "@/lib/axios/requestPolicy"

describe("timeoutFor", () => {
    it("uses the AI timeout for AI endpoints", () => {
        for (const url of [
            "/api/routines/generate",
            "/api/ai/parse-diet",
            "/api/ai/supplement-chat",
            "/api/ai/stt",
            "https://api.example.com/api/ai/stt",
        ]) {
            expect(timeoutFor(url)).toBe(AI_TIMEOUT_MS)
        }
    })
    it("uses the default for other endpoints", () => {
        for (const url of ["/api/workouts", "/api/routines/finals?page=0", "/api/routines/generated-list", undefined]) {
            expect(timeoutFor(url)).toBe(DEFAULT_TIMEOUT_MS)
        }
    })
    it("respects an explicit per-request timeout", () => {
        expect(timeoutFor("/api/workouts", 5000)).toBe(5000)
        expect(timeoutFor("/api/ai/stt", 0)).toBe(AI_TIMEOUT_MS)
    })
    it("aiRequestConfig sets the AI timeout and keeps the signal", () => {
        const controller = new AbortController()
        const cfg = aiRequestConfig({ signal: controller.signal })
        expect(cfg.timeout).toBe(AI_TIMEOUT_MS)
        expect(cfg.signal).toBe(controller.signal)
    })
})

describe("isWorkoutSaveRequest", () => {
    it("matches POST /api/workouts with or without host", () => {
        expect(isWorkoutSaveRequest("post", "/api/workouts")).toBe(true)
        expect(isWorkoutSaveRequest("POST", "api/workouts/")).toBe(true)
        expect(isWorkoutSaveRequest("post", "http://localhost:8080/api/workouts")).toBe(true)
    })
    it("does not match other workout calls", () => {
        expect(isWorkoutSaveRequest("get", "/api/workouts")).toBe(false)
        expect(isWorkoutSaveRequest("post", "/api/workouts/recent")).toBe(false)
        expect(isWorkoutSaveRequest(undefined, "/api/workouts")).toBe(false)
    })
})

describe("error classifiers", () => {
    it("detects cancel, timeout and auth expiry", () => {
        expect(isCanceledError({ code: "ERR_CANCELED" })).toBe(true)
        expect(isCanceledError({ code: "ERR_NETWORK" })).toBe(false)
        expect(isTimeoutError({ code: "ECONNABORTED" })).toBe(true)
        expect(isAuthExpiredError({ response: { status: 401 } })).toBe(true)
        expect(isAuthExpiredError({ fitcoreAuthExpired: true })).toBe(true)
        expect(isAuthExpiredError({ response: { status: 500 } })).toBe(false)
        expect(isAuthExpiredError(null)).toBe(false)
    })
})
