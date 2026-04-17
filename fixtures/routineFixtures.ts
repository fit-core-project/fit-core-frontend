import { RoutineDraft } from "../types/routine"

export const mockSuccessRoutine: RoutineDraft = {
    routine_draft_id: "draft_success_991",
    generation_status: "SUCCESS",
    status_reason_code: "OK",
    is_fallback: false,
    total_estimated_time: 45,
    rationale_summary:
        "현재 대흉근 상부에 약간의 뻐근함이 있어 볼륨을 20% 줄이고, 회전근개 보호를 위해 안정적인 머신 위주로 타겟팅했습니다. 다이어트 목적에 맞춰 휴식 시간은 짧게 가져갑니다.",
    routine_blocks: [
        {
            id: "blk_001",
            exercise_name: "인클라인 덤벨 프레스",
            target_weight: 15,
            reps: 10,
            sets: 3, // DOMS 반영으로 세트 수 감소
            rest_time_sec: 90,
            coach_tip: "어깨가 벤치에서 떨어지지 않게 고정하고, 쇄골 방향으로 밀어올리세요.",
        },
        {
            id: "blk_002",
            exercise_name: "케이블 크로스오버",
            target_weight: 10,
            reps: 12,
            sets: 4,
            rest_time_sec: 60,
            coach_tip: "팔꿈치를 살짝 굽힌 상태를 유지하며 가슴을 모아주는 느낌에 집중하세요.",
        },
        {
            id: "blk_003",
            exercise_name: "케이블 푸시다운",
            target_weight: 20,
            reps: 12,
            sets: 4,
            rest_time_sec: 60,
            coach_tip: "팔꿈치를 옆구리에 단단히 고정하고 삼두근의 수축만으로 밀어내세요.",
        },
    ],
}

export const mockFallbackRoutine: RoutineDraft = {
    routine_draft_id: "draft_fallback_992",
    generation_status: "FALLBACK",
    status_reason_code: "LLM_TIMEOUT", // 화면에 "AI 응답 지연" 경고창을 띄우는 트리거
    is_fallback: true,
    total_estimated_time: 35,
    rationale_summary:
        "AI 코치 연결이 원활하지 않아 기본 안전 루틴으로 대체되었습니다. 컨디션에 맞춰 중량을 조절해 주세요.",
    routine_blocks: [
        {
            id: "blk_f01",
            exercise_name: "벤치 프레스",
            target_weight: null, // Fallback이므로 유저가 직접 입력하도록 비워둠
            reps: 10,
            sets: 3,
            rest_time_sec: 90,
            coach_tip: "주동근에 집중하며 정확한 자세를 유지하세요.",
        },
        {
            id: "blk_f02",
            exercise_name: "머신 숄더 프레스",
            target_weight: null,
            reps: 10,
            sets: 3,
            rest_time_sec: 90,
            coach_tip: "허리가 과도하게 꺾이지 않도록 코어에 힘을 주고 밀어주세요.",
        },
    ],
}
