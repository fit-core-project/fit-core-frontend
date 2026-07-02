import { useMemo } from "react"
import { Dumbbell, X } from "lucide-react"
import { WorkoutSessionResponse, WorkoutSetResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"

const RPE_LABEL: Record<number, string> = { 1: "쉬움", 2: "적당", 3: "힘듦" }

function getWorkoutTitle(workout: WorkoutSessionResponse): string {
    return (
        (workout as { routineName?: string | null }).routineName?.trim() ||
        (workout as { title?: string | null }).title?.trim() ||
        (workout as { summaryTitle?: string | null }).summaryTitle?.trim() ||
        workout.splitLabel?.trim() ||
        (workout as { targetSplitLabel?: string | null }).targetSplitLabel?.trim() ||
        "운동 세션"
    )
}

function formatDate(value: string | Date): string {
    return typeof value === "string" ? value : value.toISOString().split("T")[0]
}

function groupWorkoutSets(sets: WorkoutSetResponse[]) {
    const groups = new Map<string, { exerciseName: string; sets: WorkoutSetResponse[] }>()

    sets.forEach((set) => {
        const key = `${set.exerciseOrder}-${set.exerciseId}-${set.exerciseNameSnapshot}`
        const existing = groups.get(key)
        if (existing) {
            existing.sets.push(set)
            return
        }
        groups.set(key, { exerciseName: set.exerciseNameSnapshot, sets: [set] })
    })

    return Array.from(groups.values()).map((group) => ({
        ...group,
        sets: [...group.sets].sort((a, b) => a.setIndex - b.setIndex),
    }))
}

interface WorkoutDetailModalProps {
    workout: WorkoutSessionResponse
    onClose: () => void
}

export default function WorkoutDetailModal({ workout, onClose }: WorkoutDetailModalProps) {
    const title = getWorkoutTitle(workout)
    const dateStr = formatDate(workout.workoutDate)
    const groups = useMemo(() => groupWorkoutSets(workout.sets ?? []), [workout.sets])
    const totalSets = groups.reduce((total, group) => total + group.sets.length, 0)
    const { weightUnit } = useSettingsStore()
    const rpe = (workout.sets ?? []).find((set) => Number(set.rpe) > 0)?.rpe

    return (
        <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/60">
            <div className="flex h-full w-full max-w-[480px] flex-col bg-slate-50 shadow-2xl">
                <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
                    <div className="mx-auto flex w-full max-w-2xl items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="flex min-w-0 items-center text-xl font-extrabold text-slate-900">
                                <Dumbbell className="mr-2 h-5 w-5 shrink-0 text-blue-500" />
                                <span className="truncate">{title}</span>
                            </h2>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-400">
                                <span>{dateStr}</span>
                                {workout.durationMin ? <span>{workout.durationMin}분</span> : null}
                                <span>{totalSets}세트</span>
                                {rpe != null && RPE_LABEL[Number(rpe)] && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                        체감 강도 · {RPE_LABEL[Number(rpe)]}
                                    </span>
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="운동 상세 닫기"
                            onClick={onClose}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto p-4 pb-6">
                    {groups.length === 0 ? (
                        <div className="rounded-3xl border border-slate-100 bg-white px-5 py-12 text-center text-sm font-medium text-slate-400">
                            세트 기록이 없습니다.
                        </div>
                    ) : (
                        groups.map((group, blockIndex) => (
                            <div
                                key={`${group.exerciseName}-${blockIndex}`}
                                className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                            >
                                <div className="border-b border-gray-50 bg-slate-900 p-5 text-white">
                                    <h3 className="flex min-w-0 items-center text-lg font-bold">
                                        <span className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm">
                                            {blockIndex + 1}
                                        </span>
                                        <span className="truncate">{group.exerciseName}</span>
                                    </h3>
                                </div>
                                <div className="p-2">
                                    {group.sets.map((set) => (
                                        <div
                                            key={set.id}
                                            className="my-1 grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2 rounded-2xl bg-gray-50 px-3 py-3"
                                        >
                                            <div className="text-center text-sm font-bold text-slate-400">
                                                {set.setIndex} Set
                                            </div>
                                            <div className="text-base font-extrabold text-slate-800">
                                                {set.weightKg > 0
                                                    ? `${weightUnit === "lbs" ? Math.round(set.weightKg * 2.20462) : set.weightKg}${weightUnit}`
                                                    : "맨몸"}
                                            </div>
                                            <div className="text-sm font-bold text-slate-600">{set.reps}회</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
