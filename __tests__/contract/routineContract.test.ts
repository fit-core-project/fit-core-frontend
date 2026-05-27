/**
 * Golden Fixture 기반 FE Data Contract Test
 *
 * 목적: AI 엔진 → BE → FE 응답 계약 무결성 검증
 * 픽스처 파일에 실제 데이터를 채운 후 모든 테스트가 통과해야 한다.
 *
 * 실패 케이스 예상 (픽스처 비어있는 동안):
 *   - success: routineBlocks가 비어있어 assertions 실패
 *   - fallback: isFallback, statusReasonCode 기본값이 계약과 불일치
 *   - failed: generationStatus 기본값 "success" → guard 미발동
 */
import { describe, it, expect } from "vitest"
import { normalizeRoutineResponse } from "../../utils/routineAdapter"
import type { RoutineDraft } from "../../types/routine"

import successFixture from "../fixtures/routine_success.json"
import fallbackFixture from "../fixtures/routine_fallback.json"
import failedFixture from "../fixtures/routine_failed.json"

/**
 * 소비자 레벨 가드: generationStatus가 "failed"이면 예외를 던진다.
 * 렌더링 전 호출해야 하는 계약 검증 헬퍼.
 */
function assertDraftUsable(draft: RoutineDraft): void {
    if (draft.generationStatus === "failed") {
        throw new Error(
            `[Contract] 루틴 생성 실패 — statusReasonCode: ${draft.statusReasonCode}. ` +
                `안전 후보가 없거나 엔진 오류가 발생했습니다.`
        )
    }
}

// ---------------------------------------------------------------------------
// Success Case — Path A (Golden): 백엔드 render-ready routineBlocks[]
// ---------------------------------------------------------------------------
describe("Contract: Success Response (Path A — Golden)", () => {
    it("routineDraftId가 비어있지 않은 문자열이어야 한다", () => {
        const draft = normalizeRoutineResponse(successFixture)
        expect(typeof draft.routineDraftId).toBe("string")
        expect(draft.routineDraftId.length).toBeGreaterThan(0)
    })

    it("generationStatus === 'success'", () => {
        const draft = normalizeRoutineResponse(successFixture)
        expect(draft.generationStatus).toBe("success")
    })

    it("statusReasonCode === 'none'", () => {
        const draft = normalizeRoutineResponse(successFixture)
        expect(draft.statusReasonCode).toBe("none")
    })

    it("isFallback === false", () => {
        const draft = normalizeRoutineResponse(successFixture)
        expect(draft.isFallback).toBe(false)
    })

    it("routineBlocks가 1개 이상이어야 한다", () => {
        const draft = normalizeRoutineResponse(successFixture)
        expect(draft.routineBlocks.length).toBeGreaterThan(0)
    })

    it("각 routineBlock에 exerciseId, exerciseName, prescription이 있어야 한다", () => {
        const draft = normalizeRoutineResponse(successFixture)
        for (const block of draft.routineBlocks) {
            expect(typeof block.exerciseId).toBe("string")
            expect(block.exerciseId.length).toBeGreaterThan(0)
            expect(typeof block.exerciseName).toBe("string")
            expect(Array.isArray(block.prescription)).toBe(true)
            expect(block.prescription.length).toBeGreaterThan(0)
        }
    })

    it("각 prescription에 setIndex, targetReps, targetRestSec이 있어야 한다", () => {
        const draft = normalizeRoutineResponse(successFixture)
        for (const block of draft.routineBlocks) {
            for (const set of block.prescription) {
                expect(set.setIndex).toBeGreaterThanOrEqual(1)
                expect(set.targetReps).toBeGreaterThan(0)
                expect(set.targetRestSec).toBeGreaterThanOrEqual(0)
            }
        }
    })

    it("routineDraftId 누락 시 에러를 던진다 (Path A 계약 위반)", () => {
        const brokenGolden = { ...successFixture, routineBlocks: [{}], routineDraftId: undefined }
        expect(() => normalizeRoutineResponse(brokenGolden)).toThrow(/Missing routineDraftId/)
    })

    it("소비자 가드가 success 응답에서는 에러를 던지지 않는다", () => {
        const draft = normalizeRoutineResponse(successFixture)
        expect(() => assertDraftUsable(draft)).not.toThrow()
    })
})

// ---------------------------------------------------------------------------
// Fallback Case — 안전 후보 부족으로 규칙 기반 보수적 대체
// ---------------------------------------------------------------------------
describe("Contract: Fallback Response", () => {
    it("generationStatus === 'fallback'", () => {
        const draft = normalizeRoutineResponse(fallbackFixture)
        expect(draft.generationStatus).toBe("fallback")
    })

    it("isFallback === true", () => {
        const draft = normalizeRoutineResponse(fallbackFixture)
        expect(draft.isFallback).toBe(true)
    })

    it("statusReasonCode가 'none'이 아닌 구체적인 이유 코드여야 한다", () => {
        const draft = normalizeRoutineResponse(fallbackFixture)
        expect(draft.statusReasonCode).not.toBe("none")
        expect(["llmTimeout", "schemaError", "networkError", "emptyCandidate"]).toContain(
            draft.statusReasonCode
        )
    })

    it("warnings 배열에 fallback 발동 이유가 1개 이상 포함되어야 한다", () => {
        const draft = normalizeRoutineResponse(fallbackFixture)
        expect(Array.isArray(draft.warnings)).toBe(true)
        expect(draft.warnings.length).toBeGreaterThan(0)
    })

    it("fallback에도 routineBlocks가 1개 이상 있어야 한다 (보수적 대체 운동 포함)", () => {
        const draft = normalizeRoutineResponse(fallbackFixture)
        expect(draft.routineBlocks.length).toBeGreaterThan(0)
    })

    it("소비자 가드가 fallback 응답에서는 에러를 던지지 않는다", () => {
        const draft = normalizeRoutineResponse(fallbackFixture)
        expect(() => assertDraftUsable(draft)).not.toThrow()
    })
})

// ---------------------------------------------------------------------------
// Failed Case — emptyCandidate: 안전 후보 없음, 루틴 생성 불가
// ---------------------------------------------------------------------------
describe("Contract: Failed Response (emptyCandidate)", () => {
    it("generationStatus === 'failed'", () => {
        const draft = normalizeRoutineResponse(failedFixture)
        expect(draft.generationStatus).toBe("failed")
    })

    it("statusReasonCode === 'emptyCandidate'", () => {
        const draft = normalizeRoutineResponse(failedFixture)
        expect(draft.statusReasonCode).toBe("emptyCandidate")
    })

    it("routineBlocks가 비어있어야 한다 (생성된 운동 없음)", () => {
        const draft = normalizeRoutineResponse(failedFixture)
        expect(draft.routineBlocks).toHaveLength(0)
    })

    it("소비자 가드가 failed 응답에서 명확한 에러를 던진다", () => {
        const draft = normalizeRoutineResponse(failedFixture)
        expect(() => assertDraftUsable(draft)).toThrow(/루틴 생성 실패/)
    })

    it("소비자 가드 에러 메시지에 statusReasonCode가 포함된다", () => {
        const draft = normalizeRoutineResponse(failedFixture)
        expect(() => assertDraftUsable(draft)).toThrow(/emptyCandidate/)
    })
})
