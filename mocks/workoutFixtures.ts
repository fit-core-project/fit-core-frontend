import { WorkoutSessionResponse, WorkoutSetResponse, Page } from "@/types/project"

// ── 세트 헬퍼 ─────────────────────────────────────────────────────────────────
const ws = (
    id: string,
    exerciseOrder: number,
    exerciseId: string,
    exerciseNameSnapshot: string,
    setIndex: number,
    weightKg: number,
    reps: number,
    rpe: number,
    restSec: number
): WorkoutSetResponse => ({
    id,
    exerciseOrder,
    exerciseId,
    exerciseNameSnapshot,
    setIndex,
    setType: "working",
    trackingMode: "weightReps",
    weightKg,
    reps,
    rpe,
    rir: 10 - rpe,
    isFailure: false,
    restSec,
    setNote: "",
})

// ── Session 1: Push ───────────────────────────────────────────────────────────
const pushSession: WorkoutSessionResponse = {
    id: "ws_001",
    userId: "user_mock_001",
    workoutDate: "2026-05-02",
    splitLabel: "Push — 상부 흉근 집중",
    routineName: "상부 흉근 볼륨업 루틴",
    sourceRoutineFinalId: "final_mock_001",
    timeAvailableMin: 60,
    durationMin: 52,
    readinessLevel: "normal",
    currentPainAreas: [],
    currentDoms: [],
    unavailableEquipment: [],
    sessionNote: "",
    createdAt: "2026-05-02T18:30:00Z",
    updatedAt: "2026-05-02T18:30:00Z",
    sets: [
        ws("s_001", 1, "ex_incline_dumbbell", "인클라인 덤벨 프레스", 1, 15, 12, 7, 90),
        ws("s_002", 1, "ex_incline_dumbbell", "인클라인 덤벨 프레스", 2, 17.5, 10, 8, 90),
        ws("s_003", 1, "ex_incline_dumbbell", "인클라인 덤벨 프레스", 3, 17.5, 9, 9, 90),
        ws("s_004", 2, "ex_cable_crossover", "케이블 크로스오버", 1, 10, 15, 7, 60),
        ws("s_005", 2, "ex_cable_crossover", "케이블 크로스오버", 2, 12, 12, 8, 60),
        ws("s_006", 2, "ex_cable_crossover", "케이블 크로스오버", 3, 12, 11, 9, 60),
        ws("s_007", 3, "ex_cable_pushdown", "케이블 푸시다운 (로프)", 1, 20, 15, 7, 60),
        ws("s_008", 3, "ex_cable_pushdown", "케이블 푸시다운 (로프)", 2, 22.5, 12, 8, 60),
        ws("s_009", 3, "ex_cable_pushdown", "케이블 푸시다운 (로프)", 3, 22.5, 10, 9, 60),
    ],
}

// ── Session 2: Pull ───────────────────────────────────────────────────────────
const pullSession: WorkoutSessionResponse = {
    id: "ws_002",
    userId: "user_mock_001",
    workoutDate: "2026-04-30",
    splitLabel: "Pull — 등 + 이두",
    routineName: "등 두께 강화 루틴",
    sourceRoutineFinalId: "final_mock_002",
    timeAvailableMin: 60,
    durationMin: 48,
    readinessLevel: "normal",
    currentPainAreas: [],
    currentDoms: [],
    unavailableEquipment: [],
    sessionNote: "",
    createdAt: "2026-04-30T19:00:00Z",
    updatedAt: "2026-04-30T19:00:00Z",
    sets: [
        ws("s_010", 1, "ex_barbell_row", "바벨 벤트오버 로우", 1, 60, 10, 7, 120),
        ws("s_011", 1, "ex_barbell_row", "바벨 벤트오버 로우", 2, 65, 8, 8, 120),
        ws("s_012", 1, "ex_barbell_row", "바벨 벤트오버 로우", 3, 65, 8, 9, 120),
        ws("s_013", 2, "ex_lat_pulldown", "렛 풀다운", 1, 52.5, 12, 7, 90),
        ws("s_014", 2, "ex_lat_pulldown", "렛 풀다운", 2, 55, 10, 8, 90),
        ws("s_015", 2, "ex_lat_pulldown", "렛 풀다운", 3, 55, 9, 9, 90),
        ws("s_016", 3, "ex_dumbbell_curl", "덤벨 얼터네이팅 컬", 1, 10, 12, 7, 60),
        ws("s_017", 3, "ex_dumbbell_curl", "덤벨 얼터네이팅 컬", 2, 12, 10, 8, 60),
        ws("s_018", 3, "ex_dumbbell_curl", "덤벨 얼터네이팅 컬", 3, 12, 9, 9, 60),
    ],
}

// ── Session 3: Legs ───────────────────────────────────────────────────────────
const legsSession: WorkoutSessionResponse = {
    id: "ws_003",
    userId: "user_mock_001",
    workoutDate: "2026-04-28",
    splitLabel: "Legs — 하체 종합",
    routineName: "하체 근비대 루틴",
    sourceRoutineFinalId: "final_mock_003",
    timeAvailableMin: 75,
    durationMin: 65,
    readinessLevel: "normal",
    currentPainAreas: [],
    currentDoms: [{ bodyPart: "quads", level: "mild" }],
    unavailableEquipment: [],
    sessionNote: "",
    createdAt: "2026-04-28T17:00:00Z",
    updatedAt: "2026-04-28T17:00:00Z",
    sets: [
        ws("s_019", 1, "ex_barbell_squat", "바벨 백 스쿼트", 1, 80, 8, 7, 180),
        ws("s_020", 1, "ex_barbell_squat", "바벨 백 스쿼트", 2, 87.5, 6, 8, 180),
        ws("s_021", 1, "ex_barbell_squat", "바벨 백 스쿼트", 3, 87.5, 6, 9, 180),
        ws("s_022", 1, "ex_barbell_squat", "바벨 백 스쿼트", 4, 85, 7, 9, 180),
        ws("s_023", 2, "ex_leg_press", "레그 프레스", 1, 150, 12, 7, 120),
        ws("s_024", 2, "ex_leg_press", "레그 프레스", 2, 160, 10, 8, 120),
        ws("s_025", 2, "ex_leg_press", "레그 프레스", 3, 160, 10, 9, 120),
        ws("s_026", 3, "ex_seated_leg_curl", "시티드 레그 컬", 1, 35, 12, 7, 90),
        ws("s_027", 3, "ex_seated_leg_curl", "시티드 레그 컬", 2, 37.5, 10, 8, 90),
        ws("s_028", 3, "ex_seated_leg_curl", "시티드 레그 컬", 3, 37.5, 9, 9, 90),
    ],
}

export const mockWorkoutSessions: WorkoutSessionResponse[] = [pushSession, pullSession, legsSession]

export const mockRecentWorkoutsPage: Page<WorkoutSessionResponse> = {
    content: mockWorkoutSessions,
    last: true,
    totalPages: 1,
    totalElements: 3,
    size: 10,
    number: 0,
    first: true,
    numberOfElements: 3,
    empty: false,
}
