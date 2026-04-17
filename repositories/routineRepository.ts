import { RoutineDraft } from "../types/routine"
import { normalizeRoutineResponse } from "../utils/routineAdapter"
import { mockSuccessRoutine, mockFallbackRoutine } from "../fixtures/routineFixtures"

// 1. 공통 인터페이스 (UI는 오직 이 명세서만 보고 통신합니다)
export interface RoutineRepository {
    generateDraft(payload: any): Promise<RoutineDraft>
}

// 2. Fixture (가짜 데이터) 구현체
export class FixtureRoutineRepository implements RoutineRepository {
    async generateDraft(payload: any): Promise<RoutineDraft> {
        console.log("[Fixture Mode] 루틴 생성 요청됨:", payload)

        // API 통신을 흉내 내기 위해 1.5초 강제 지연 (로딩 UI 테스트용)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // 기획자 오더: 타임아웃/에러 시 Fallback 테스트를 위해 강제 에러 상황 시뮬레이션 가능
        const simulateError = payload.target_muscles?.includes("error_trigger")

        if (simulateError) {
            console.warn("[Fixture Mode] 강제 Fallback 상태 반환")
            return mockFallbackRoutine
        }

        return mockSuccessRoutine
    }
}

// 3. HTTP (실제 API) 구현체
export class HttpRoutineRepository implements RoutineRepository {
    async generateDraft(payload: any): Promise<RoutineDraft> {
        try {
            const response = await fetch("/api/ai/generate-routine" /* ... 생략 ... */)
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

            const rawData = await response.json()
            return normalizeRoutineResponse(rawData, { status: "SUCCESS" })
        } catch (error) {
            console.error("[HTTP Mode] API 호출 실패, Fallback으로 전환:", error)

            // ✅ 수정됨: 어댑터를 태우지 않고 이미 완성된 mock 데이터에 상태만 덮어씌움
            return {
                ...mockFallbackRoutine,
                generation_status: "FALLBACK",
                status_reason_code: "LLM_TIMEOUT",
                is_fallback: true,
            }
        }
    }
}

// ==========================================
// 4. Mode Switch (실행 환경 분기)
// ==========================================
// .env.local 파일의 NEXT_PUBLIC_API_MODE 값에 따라 자동으로 스위칭됩니다.
// 값이 없으면 기본적으로 'fixture' 모드로 동작합니다.

const MODE = process.env.NEXT_PUBLIC_API_MODE || "fixture"

export const routineRepository: RoutineRepository =
    MODE === "real" ? new HttpRoutineRepository() : new FixtureRoutineRepository()
