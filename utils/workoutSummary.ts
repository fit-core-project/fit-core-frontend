import type { WorkoutSaveRequest, WorkoutSetSaveRequest } from "@/lib/api/workout/workoutApiClient"
import type { PrResponse } from "@/types/project"
import { toDisplayWeight, unitLabel, type WeightUnit } from "@/utils/workoutSets"

/** Epley, same as the backend's OneRmCalculator: weight × (1 + reps / 30). */
export function estimate1Rm(weightKg: number, reps: number): number {
    return weightKg * (1 + reps / 30)
}

/** The backend stores/returns e1RM rounded to 1 decimal (HALF_UP); compare on the same grid. */
export function roundE1Rm(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10
}

/** Sets the backend counts toward PRs: working sets with a weight and reps. */
function isPrEligible(set: WorkoutSetSaveRequest): set is WorkoutSetSaveRequest & { weightKg: number } {
    return (set.setType || "working") === "working" && set.weightKg !== null && set.weightKg > 0 && set.reps > 0
}

export interface SummaryBestSet {
    weightKg: number | null
    reps: number
    /** null for bodyweight sets. */
    estimated1Rm: number | null
}

export interface SummaryExercise {
    exerciseId: string
    exerciseName: string
    setCount: number
    bestSet: SummaryBestSet
}

export interface SummaryPr {
    exerciseId: string
    exerciseName: string
    weightKg: number
    reps: number
    estimated1Rm: number
    /** null: first weighted record of this exercise. */
    previous1Rm: number | null
}

export interface WorkoutSummary {
    durationMin: number
    completedSets: number
    totalVolumeKg: number
    exercises: SummaryExercise[]
    /** null when the previous PRs couldn't be loaded (no PR section shown). */
    newPrs: SummaryPr[] | null
}

/** Best of a set list: highest e1RM among weighted sets, otherwise most reps (bodyweight). */
function bestOf(sets: WorkoutSetSaveRequest[]): SummaryBestSet {
    let best: SummaryBestSet | null = null
    for (const set of sets) {
        const weighted = set.weightKg !== null && set.weightKg > 0
        const e1rm = weighted ? roundE1Rm(estimate1Rm(set.weightKg as number, set.reps)) : null
        const candidate: SummaryBestSet = { weightKg: weighted ? set.weightKg : null, reps: set.reps, estimated1Rm: e1rm }
        if (!best) {
            best = candidate
            continue
        }
        if (candidate.estimated1Rm !== null) {
            if (best.estimated1Rm === null || candidate.estimated1Rm > best.estimated1Rm) best = candidate
        } else if (best.estimated1Rm === null && candidate.reps > best.reps) {
            best = candidate
        }
    }
    return best ?? { weightKg: null, reps: 0, estimated1Rm: null }
}

/**
 * Post-save summary from the saved payload.
 * `priorPrs`: GET /api/workouts/prs fetched before the save; null when that fetch failed.
 */
export function buildWorkoutSummary(payload: Pick<WorkoutSaveRequest, "durationMin" | "sets">, priorPrs: PrResponse[] | null): WorkoutSummary {
    const sets = payload.sets
    const totalVolumeKg = sets.reduce((sum, set) => sum + (set.weightKg !== null && set.weightKg > 0 ? set.weightKg * set.reps : 0), 0)

    const byExercise = new Map<string, { name: string; order: number; sets: WorkoutSetSaveRequest[] }>()
    for (const set of sets) {
        const entry = byExercise.get(set.exerciseId)
        if (entry) entry.sets.push(set)
        else byExercise.set(set.exerciseId, { name: set.exerciseNameSnapshot, order: set.exerciseOrder, sets: [set] })
    }
    const ordered = [...byExercise.entries()].sort((a, b) => a[1].order - b[1].order)

    const exercises: SummaryExercise[] = ordered.map(([exerciseId, entry]) => ({
        exerciseId,
        exerciseName: entry.name,
        setCount: entry.sets.length,
        bestSet: bestOf(entry.sets),
    }))

    let newPrs: SummaryPr[] | null = null
    if (priorPrs) {
        const prior = new Map(priorPrs.map((pr) => [pr.exerciseId, Number(pr.estimated1RM)]))
        newPrs = []
        for (const [exerciseId, entry] of ordered) {
            const eligible = entry.sets.filter(isPrEligible)
            if (eligible.length === 0) continue
            const top = eligible.reduce((a, b) => (estimate1Rm(b.weightKg, b.reps) > estimate1Rm(a.weightKg, a.reps) ? b : a))
            const e1rm = roundE1Rm(estimate1Rm(top.weightKg, top.reps))
            const previous = prior.get(exerciseId)
            const hasPrevious = previous !== undefined && Number.isFinite(previous)
            if (hasPrevious && !(e1rm > (previous as number))) continue
            newPrs.push({
                exerciseId,
                exerciseName: entry.name,
                weightKg: top.weightKg,
                reps: top.reps,
                estimated1Rm: e1rm,
                previous1Rm: hasPrevious ? (previous as number) : null,
            })
        }
    }

    return { durationMin: payload.durationMin, completedSets: sets.length, totalVolumeKg, exercises, newPrs }
}

/** Total volume in the user's unit, whole numbers with grouping: "4,250kg", "9,370lb". */
export function formatVolume(volumeKg: number, unit: WeightUnit): string {
    const value = volumeKg > 0 ? Math.round(toDisplayWeight(volumeKg, unit)) : 0
    return `${value.toLocaleString("ko-KR")}${unitLabel(unit)}`
}

/** "45분", "1시간 5분". */
export function formatDurationMin(minutes: number): string {
    const m = Math.max(0, Math.round(minutes))
    const h = Math.floor(m / 60)
    const rest = m % 60
    if (h === 0) return `${rest}분`
    return rest === 0 ? `${h}시간` : `${h}시간 ${rest}분`
}
