import { RoutineDraft } from "../types/routine"

export const mockSuccessRoutine: RoutineDraft = {
    routineDraftId: "draft_success_991",
    generationStatus: "SUCCESS",
    statusReasonCode: "OK",
    isFallback: false,
    totalEstimatedTime: 45,
    summaryTitle: "상부 흉근 집중 + 삼두 보조 루틴",
    rationaleSummary: [
        "현재 대흉근 상부에 약간의 뻐근함이 있어 볼륨을 20% 줄였습니다.",
        "회전근개 보호를 위해 안정적인 머신 위주로 타겟팅했습니다.",
        "다이어트 목적에 맞춰 세트 간 휴식 시간을 짧게 가져갑니다.",
    ],
    warnings: ["대흉근 DOMS 감지 — 총 볼륨 20% 감소 적용됨"],
    routineBlocks: [
        {
            id: "blk_001",
            exerciseName: "인클라인 덤벨 프레스",
            exerciseRationale: "어깨가 벤치에서 떨어지지 않게 고정하고, 쇄골 방향으로 밀어올리세요.",
            prescription: [
                { setIndex: 0, targetReps: 12, targetWeightKg: 12, targetRir: 3, targetRestSec: 90 },
                { setIndex: 1, targetReps: 10, targetWeightKg: 15, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, targetReps: 10, targetWeightKg: 15, targetRir: 2, targetRestSec: 90 },
            ],
        },
        {
            id: "blk_002",
            exerciseName: "케이블 크로스오버",
            exerciseRationale: "팔꿈치를 살짝 굽힌 상태를 유지하며 가슴을 모아주는 느낌에 집중하세요.",
            prescription: [
                { setIndex: 0, targetReps: 15, targetWeightKg: 8, targetRir: 3, targetRestSec: 60 },
                { setIndex: 1, targetReps: 12, targetWeightKg: 10, targetRir: 2, targetRestSec: 60 },
                { setIndex: 2, targetReps: 12, targetWeightKg: 10, targetRir: 2, targetRestSec: 60 },
                { setIndex: 3, targetReps: 10, targetWeightKg: 10, targetRir: 1, targetRestSec: 60 },
            ],
        },
        {
            id: "blk_003",
            exerciseName: "케이블 푸시다운",
            exerciseRationale: "팔꿈치를 옆구리에 단단히 고정하고 삼두근의 수축만으로 밀어내세요.",
            prescription: [
                { setIndex: 0, targetReps: 15, targetWeightKg: 18, targetRir: 3, targetRestSec: 60 },
                { setIndex: 1, targetReps: 12, targetWeightKg: 20, targetRir: 2, targetRestSec: 60 },
                { setIndex: 2, targetReps: 12, targetWeightKg: 20, targetRir: 2, targetRestSec: 60 },
                { setIndex: 3, targetReps: 10, targetWeightKg: 20, targetRir: 1, targetRestSec: 60 },
            ],
        },
    ],
}

export const mockFallbackRoutine: RoutineDraft = {
    routineDraftId: "draft_fallback_992",
    generationStatus: "FALLBACK",
    statusReasonCode: "LLM_TIMEOUT",
    isFallback: true,
    totalEstimatedTime: 35,
    summaryTitle: "기본 안전 루틴 (AI 대체)",
    rationaleSummary: [
        "AI 코치 연결이 원활하지 않아 기본 안전 루틴으로 대체되었습니다.",
        "컨디션에 맞춰 중량을 직접 조절해 주세요.",
    ],
    warnings: ["AI 응답 지연 — 기본 루틴으로 대체됨"],
    routineBlocks: [
        {
            id: "blk_f01",
            exerciseName: "벤치 프레스",
            exerciseRationale: "주동근에 집중하며 정확한 자세를 유지하세요.",
            prescription: [
                { setIndex: 0, targetReps: 12, targetWeightKg: null, targetRir: 3, targetRestSec: 90 },
                { setIndex: 1, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
            ],
        },
        {
            id: "blk_f02",
            exerciseName: "머신 숄더 프레스",
            exerciseRationale: "허리가 과도하게 꺾이지 않도록 코어에 힘을 주고 밀어주세요.",
            prescription: [
                { setIndex: 0, targetReps: 12, targetWeightKg: null, targetRir: 3, targetRestSec: 90 },
                { setIndex: 1, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
                { setIndex: 2, targetReps: 10, targetWeightKg: null, targetRir: 2, targetRestSec: 90 },
            ],
        },
    ],
}
