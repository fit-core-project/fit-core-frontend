import { useMemo } from "react"
import { WorkoutSessionResponse, WorkoutSetResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"
import { splitTitle } from "@/utils/displayLabels"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR } from "@/utils/routeLine"
import { LineBadge, Sheet, Tag } from "@/components/ui"
import { toYmd } from "@/utils/date"

const RPE_LABEL: Record<number, string> = { 1: "쉬움", 2: "적당", 3: "힘듦" }

function getWorkoutTitle(workout: WorkoutSessionResponse): string {
    return (
        workout.routineName?.trim() ||
        workout.title?.trim() ||
        workout.summaryTitle?.trim() ||
        splitTitle(workout.splitLabel) ||
        splitTitle(workout.targetSplitLabel) ||
        "운동 세션"
    )
}

const formatDate = toYmd

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
    const rpeLabel = rpe != null ? RPE_LABEL[Number(rpe)] : undefined
    const line = lineForRoutine(workout.targetSplitLabel ?? workout.splitLabel)
    const color = ROUTE_LINE_COLOR_VAR[line]

    const description = [dateStr, workout.durationMin ? `${workout.durationMin}분` : null, `${totalSets}세트`].filter(Boolean).join(" · ")

    const formatWeight = (set: WorkoutSetResponse) =>
        set.weightKg > 0 ? `${weightUnit === "lbs" ? Math.round(set.weightKg * 2.20462) : set.weightKg}${weightUnit}` : "맨몸"

    return (
        <Sheet open onClose={onClose} title={title} description={description}>
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <LineBadge line={line} />
                    {rpeLabel && <Tag>체감 강도 {rpeLabel}</Tag>}
                </div>

                {groups.length === 0 ? (
                    <p className="py-6 text-center text-body-sm text-ink-2">이 운동에는 저장된 세트가 없어요.</p>
                ) : (
                    <ol className="flex flex-col gap-5" aria-label="운동별 세트 기록">
                        {groups.map((group, blockIndex) => (
                            <li key={`${group.exerciseName}-${blockIndex}`} className="flex flex-col gap-2">
                                <h3 className="flex min-w-0 items-center gap-2 text-body font-bold text-ink">
                                    <span
                                        aria-hidden
                                        className="size-3.5 shrink-0 rounded-full border-[3px] bg-ground"
                                        style={{ borderColor: color }}
                                    />
                                    <span className="truncate">{group.exerciseName}</span>
                                </h3>
                                <ul className="flex flex-col divide-y divide-hairline border-y border-hairline pl-5.5">
                                    {group.sets.map((set) => (
                                        <li key={set.id} className="flex min-h-11 items-center gap-2 text-body text-ink tabular-nums">
                                            <span className="text-ink-2">{set.setIndex}세트</span>
                                            <span aria-hidden className="text-ink-2">·</span>
                                            <span className="font-medium">{formatWeight(set)}</span>
                                            <span aria-hidden className="text-ink-2">·</span>
                                            <span>{set.reps}회</span>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </Sheet>
    )
}
