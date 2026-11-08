"use client"

import { useMemo, useState } from "react"
import { BicepsFlexed, Percent, Plus, Scale } from "lucide-react"
import StatCard from "@/app/my/body-composition/StatCard"
import BodyCompositionChart from "@/app/my/body-composition/BodyCompositionChart"
import { BodyCompositionEditPage } from "@/app/my/body-composition/BodyCompositionEditPage"
import { BodyComposition, UserResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"
import { Button, EmptyState, Section, Surface, ToggleChip } from "@/components/ui"

interface Props {
    profile: UserResponse | null
    onSave: (formData: BodyComposition) => Promise<boolean>
}

interface StatDiff {
    text: string
    value?: string
    type: "up" | "down" | "none"
}

const rangeOptions = [
    { label: "3년", months: 36 },
    { label: "1년", months: 12 },
    { label: "6개월", months: 6 },
    { label: "3개월", months: 3 },
    { label: "1개월", months: 1 },
]

const calculateDiff = (current: number | undefined, prev: number | undefined, unit: string): StatDiff => {
    if (current === undefined || prev === undefined) {
        return { text: "첫 측정 기록", type: "none" }
    }

    const diff = current - prev
    const absDiff = Math.abs(diff).toFixed(1)

    if (diff === 0) return { text: "변화 없음", type: "none" }

    return {
        text: diff > 0 ? "증가" : "감소",
        value: `${diff > 0 ? "+" : ""}${absDiff}${unit}`,
        type: diff > 0 ? "up" : "down",
    }
}

function BodyCompositionRangeSlider({ value, onChange }: { value: number; onChange: (nextValue: number) => void }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span id="body-comp-range-label" className="text-body-sm font-medium text-ink">
                표시 기간
            </span>
            <div className="grid grid-cols-5 gap-1.5" role="group" aria-labelledby="body-comp-range-label">
                {rangeOptions.map((option, index) => (
                    <ToggleChip key={option.label} pressed={value === index} onClick={() => onChange(index)}>
                        {option.label}
                    </ToggleChip>
                ))}
            </div>
        </div>
    )
}

function kgToDisplay(kg: number | undefined, unit: "kg" | "lbs"): number | undefined {
    if (kg == null) return undefined
    return unit === "lbs" ? +(kg * 2.20462).toFixed(1) : kg
}

export default function BodyCompositionPage({ profile, onSave }: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const [rangeIndex, setRangeIndex] = useState(2)
    const { weightUnit } = useSettingsStore()
    const snapshots = useMemo(() => profile?.bodyCompositionSnapshot || [], [profile?.bodyCompositionSnapshot])
    const latest = snapshots[0]
    const previous = snapshots[1]

    const filteredSnapshots = useMemo(() => {
        if (snapshots.length === 0) return []

        const datedSnapshots = snapshots.filter((item) => item.measuredAt)
        const latestTime = Math.max(...datedSnapshots.map((item) => new Date(item.measuredAt as string).getTime()))

        if (!Number.isFinite(latestTime)) return snapshots

        const cutoff = new Date(latestTime)
        cutoff.setMonth(cutoff.getMonth() - rangeOptions[rangeIndex].months)

        return snapshots.filter((item) => {
            if (!item.measuredAt) return false
            return new Date(item.measuredAt).getTime() >= cutoff.getTime()
        })
    }, [rangeIndex, snapshots])

    const weightVal = kgToDisplay(latest?.bodyWeightKg, weightUnit)
    const prevWeightVal = kgToDisplay(previous?.bodyWeightKg, weightUnit)
    const muscleVal = kgToDisplay(latest?.skeletalMuscleMassKg, weightUnit)
    const prevMuscleVal = kgToDisplay(previous?.skeletalMuscleMassKg, weightUnit)

    const latestData = {
        weight: {
            value: weightVal?.toFixed(1) ?? "-",
            unit: weightUnit,
            diff: calculateDiff(weightVal, prevWeightVal, weightUnit),
        },
        muscle: {
            value: muscleVal?.toFixed(1) ?? "-",
            unit: weightUnit,
            diff: calculateDiff(muscleVal, prevMuscleVal, weightUnit),
        },
        fat: {
            value: latest?.bodyFatPct?.toFixed(1) ?? "-",
            unit: "%",
            diff: calculateDiff(latest?.bodyFatPct, previous?.bodyFatPct, "%"),
        },
    }

    const saveTrack = async (formData: BodyComposition) => {
        if (await onSave(formData)) {
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return <BodyCompositionEditPage onCancel={() => setIsEditing(false)} onSave={saveTrack} />
    }

    const addButton = (
        <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setIsEditing(true)}>
            기록 추가
        </Button>
    )

    return (
        <Section title="체성분 변화" action={snapshots.length > 0 ? addButton : undefined}>
            {snapshots.length === 0 ? (
                <Surface>
                    <EmptyState
                        icon={<Scale aria-hidden />}
                        title="아직 체성분 기록이 없어요"
                        body="체중을 기록하면 변화 추이를 볼 수 있어요."
                        action={
                            <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setIsEditing(true)}>
                                첫 기록 남기기
                            </Button>
                        }
                    />
                </Surface>
            ) : (
                <>
                    <div className="flex flex-col gap-2">
                        <h3 className="text-body-sm font-medium text-ink-2">최근 측정</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <StatCard
                                label="체중"
                                value={latestData.weight.value}
                                unit={latestData.weight.unit}
                                icon={<Scale strokeWidth={1.8} />}
                                diff={latestData.weight.diff}
                            />
                            <StatCard
                                label="골격근량"
                                value={latestData.muscle.value}
                                unit={latestData.muscle.unit}
                                icon={<BicepsFlexed strokeWidth={1.8} />}
                                diff={latestData.muscle.diff}
                            />
                            <StatCard
                                label="체지방률"
                                value={latestData.fat.value}
                                unit={latestData.fat.unit}
                                icon={<Percent strokeWidth={1.8} />}
                                diff={latestData.fat.diff}
                            />
                        </div>
                    </div>

                    <Surface className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-body font-bold text-ink">변화 추이</h3>
                            <span className="text-caption tabular-nums text-ink-2">기록 {filteredSnapshots.length}개</span>
                        </div>
                        <BodyCompositionRangeSlider value={rangeIndex} onChange={setRangeIndex} />
                        <BodyCompositionChart data={filteredSnapshots} weightUnit={weightUnit} />
                    </Surface>
                </>
            )}
        </Section>
    )
}
