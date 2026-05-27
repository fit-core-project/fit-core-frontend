import { GoalType, SplitType } from "@/types/enums"

export interface UserPainProfile {
    readonly painAreas: readonly string[]
}

export interface UserCondition extends UserPainProfile {
    doms: Partial<Record<string, 1 | 2>>
    painAreas: string[]
}

export interface UserPreferences {
    timeAvailable: number
    goal: GoalType
    equipment: string[]
    weeklyFrequency: number
    splitPreference: SplitType
    strengthBaseline: Record<string, number>
}

export interface ExerciseCatalogItem {
    id: string
    nameKr: string
    nameEn: string
    primaryMuscle: string
    secondaryMuscles: string[]
    equipment: string
    tier: 1 | 2 | 3
}

export interface RecentRecord {
    exerciseId: string
    defaultWeight: number
    defaultReps: number
}

export function getMockUserCondition(): UserCondition {
    return { doms: { quadriceps: 1, hamstring: 1, chest: 2 }, painAreas: ["lower-back"] }
}

export function getMockUserPreferences(): UserPreferences {
    return {
        timeAvailable: 60,
        goal: "hypertrophy",
        equipment: ["BARBELL", "DUMBBELL", "CABLE", "MACHINE"],
        weeklyFrequency: 4,
        splitPreference: "pushPullLegs",
        strengthBaseline: {
            benchPress: 80,
            squat: 100,
            deadlift: 120,
            overheadPress: 55,
            barbellRow: 70,
        },
    }
}

export function getMockExerciseCatalog(): ExerciseCatalogItem[] {
    return [
        {
            id: "ex_1",
            nameKr: "벤치프레스",
            nameEn: "Bench Press",
            primaryMuscle: "chest",
            secondaryMuscles: ["triceps", "frontDelt"],
            equipment: "BARBELL",
            tier: 1,
        },
        {
            id: "ex_2",
            nameKr: "스쿼트",
            nameEn: "Squat",
            primaryMuscle: "quads",
            secondaryMuscles: ["glutes", "hamstrings", "core"],
            equipment: "BARBELL",
            tier: 1,
        },
        {
            id: "ex_3",
            nameKr: "데드리프트",
            nameEn: "Deadlift",
            primaryMuscle: "hamstrings",
            secondaryMuscles: ["glutes", "lowerBack", "traps"],
            equipment: "BARBELL",
            tier: 1,
        },
        {
            id: "ex_4",
            nameKr: "풀업",
            nameEn: "Pull-up",
            primaryMuscle: "lats",
            secondaryMuscles: ["biceps", "upperBack", "rearDelt"],
            equipment: "BODYWEIGHT",
            tier: 1,
        },
        {
            id: "ex_5",
            nameKr: "랫풀다운",
            nameEn: "Lat Pulldown",
            primaryMuscle: "lats",
            secondaryMuscles: ["biceps", "upperBack"],
            equipment: "CABLE",
            tier: 2,
        },
        {
            id: "ex_6",
            nameKr: "오버헤드프레스",
            nameEn: "Overhead Press",
            primaryMuscle: "frontDelt",
            secondaryMuscles: ["triceps", "sideDelt"],
            equipment: "BARBELL",
            tier: 1,
        },
        {
            id: "ex_7",
            nameKr: "바벨로우",
            nameEn: "Barbell Row",
            primaryMuscle: "upperBack",
            secondaryMuscles: ["lats", "biceps", "rearDelt"],
            equipment: "BARBELL",
            tier: 1,
        },
        {
            id: "ex_8",
            nameKr: "레그익스텐션",
            nameEn: "Leg Extension",
            primaryMuscle: "quads",
            secondaryMuscles: [],
            equipment: "MACHINE",
            tier: 3,
        },
        {
            id: "ex_9",
            nameKr: "덤벨컬",
            nameEn: "Dumbbell Curl",
            primaryMuscle: "biceps",
            secondaryMuscles: ["brachialis"],
            equipment: "DUMBBELL",
            tier: 2,
        },
        {
            id: "ex_10",
            nameKr: "트라이셉스 푸시다운",
            nameEn: "Triceps Pushdown",
            primaryMuscle: "triceps",
            secondaryMuscles: [],
            equipment: "CABLE",
            tier: 2,
        },
        {
            id: "ex_11",
            nameKr: "인클라인 덤벨 프레스",
            nameEn: "Incline Dumbbell Press",
            primaryMuscle: "upperChest",
            secondaryMuscles: ["triceps", "frontDelt"],
            equipment: "DUMBBELL",
            tier: 2,
        },
        {
            id: "ex_12",
            nameKr: "케이블 크로스오버",
            nameEn: "Cable Crossover",
            primaryMuscle: "chest",
            secondaryMuscles: ["frontDelt"],
            equipment: "CABLE",
            tier: 3,
        },
    ]
}

const recentRecords: Record<string, RecentRecord> = {
    ex_1: { exerciseId: "ex_1", defaultWeight: 80, defaultReps: 8 },
    ex_2: { exerciseId: "ex_2", defaultWeight: 100, defaultReps: 5 },
    ex_3: { exerciseId: "ex_3", defaultWeight: 120, defaultReps: 5 },
    ex_4: { exerciseId: "ex_4", defaultWeight: 0, defaultReps: 8 },
    ex_5: { exerciseId: "ex_5", defaultWeight: 60, defaultReps: 10 },
    ex_6: { exerciseId: "ex_6", defaultWeight: 55, defaultReps: 8 },
    ex_7: { exerciseId: "ex_7", defaultWeight: 70, defaultReps: 8 },
    ex_8: { exerciseId: "ex_8", defaultWeight: 50, defaultReps: 15 },
    ex_9: { exerciseId: "ex_9", defaultWeight: 14, defaultReps: 12 },
    ex_10: { exerciseId: "ex_10", defaultWeight: 20, defaultReps: 12 },
    ex_11: { exerciseId: "ex_11", defaultWeight: 20, defaultReps: 10 },
    ex_12: { exerciseId: "ex_12", defaultWeight: 10, defaultReps: 15 },
}

export function getMockRecentRecord(exerciseId: string): RecentRecord | null {
    return recentRecords[exerciseId] ?? null
}
