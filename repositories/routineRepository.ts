import { RoutineDraft } from "../types/routine"
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

// ==========================================
// 3. Mode Switch (실행 환경 분기)
// ==========================================
// 실제 HTTP 호출은 services/aiRoutineService.ts 의 generateRoutine() 에서 담당합니다.
// 이 레포지토리는 Fixture 모드 전용입니다.

export const routineRepository: RoutineRepository = new FixtureRoutineRepository()
