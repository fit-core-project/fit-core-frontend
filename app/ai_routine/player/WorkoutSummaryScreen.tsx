"use client"

import { Button, LineBadge, Section, Surface, Tag } from "@/components/ui"
import type { RouteLine } from "@/utils/routeLine"
import { formatWeight, type WeightUnit } from "@/utils/workoutSets"
import { formatDurationMin, formatVolume, type SummaryBestSet, type WorkoutSummary } from "@/utils/workoutSummary"

interface WorkoutSummaryScreenProps {
    summary: WorkoutSummary
    title: string
    line: RouteLine
    weightUnit: WeightUnit
    /** Primary button copy, e.g. "프로그램으로" / "운동 탭으로". */
    doneLabel: string
    onDone: () => void
}

const bestSetText = (best: SummaryBestSet, unit: WeightUnit) =>
    best.weightKg === null ? `맨몸 × ${best.reps}회` : `${formatWeight(best.weightKg, unit)} × ${best.reps}회`

export function WorkoutSummaryScreen({ summary, title, line, weightUnit, doneLabel, onDone }: WorkoutSummaryScreenProps) {
    const stats = [
        { label: "운동 시간", value: formatDurationMin(summary.durationMin) },
        { label: "완료 세트", value: `${summary.completedSets}세트` },
        { label: "총 볼륨", value: formatVolume(summary.totalVolumeKg, weightUnit) },
    ]
    const prs = summary.newPrs ?? []

    return (
        <main className="absolute inset-0 flex flex-col bg-ground">
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                <div>
                    <LineBadge line={line} />
                    <h1 className="mt-3 text-headline font-bold text-ink">기록을 저장했어요</h1>
                    <p className="mt-1 text-body text-ink-2">{title}</p>
                </div>

                <dl className="grid grid-cols-3 gap-2">
                    {stats.map((stat) => (
                        <Surface key={stat.label} tone="sunken" className="flex flex-col gap-1 px-3">
                            <dt className="text-body-sm text-ink-2">{stat.label}</dt>
                            <dd className="text-title-sm font-bold tabular-nums text-ink">{stat.value}</dd>
                        </Surface>
                    ))}
                </dl>

                {prs.length > 0 && (
                    <Section title="새 기록">
                        <ul className="flex flex-col gap-2">
                            {prs.map((pr) => (
                                <li key={pr.exerciseId}>
                                    <Surface className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-body font-bold text-ink">{pr.exerciseName}</p>
                                            <p className="text-body-sm tabular-nums text-ink-2">
                                                {formatWeight(pr.weightKg, weightUnit)} × {pr.reps}회 · 추정 1RM {formatWeight(pr.estimated1Rm, weightUnit)}
                                            </p>
                                        </div>
                                        <Tag>
                                            {pr.previous1Rm === null
                                                ? "첫 기록"
                                                : `+${formatWeight(Math.max(0, pr.estimated1Rm - pr.previous1Rm), weightUnit)}`}
                                        </Tag>
                                    </Surface>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                <Section title="운동별 최고 세트">
                    <ul className="flex flex-col divide-y divide-hairline">
                        {summary.exercises.map((exercise) => (
                            <li key={exercise.exerciseId} className="flex min-h-11 items-center justify-between gap-3 py-2">
                                <span className="min-w-0 text-body text-ink">{exercise.exerciseName}</span>
                                <span className="shrink-0 text-right text-body-sm tabular-nums text-ink-2">
                                    {bestSetText(exercise.bestSet, weightUnit)}
                                    <span className="block">{exercise.setCount}세트</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>
            <div className="border-t border-hairline p-4">
                <Button variant="primary" size="lg" block line={line} onClick={onDone}>
                    {doneLabel}
                </Button>
            </div>
        </main>
    )
}
