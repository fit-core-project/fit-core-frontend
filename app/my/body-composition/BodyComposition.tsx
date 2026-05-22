"use client"

import { useMemo, useState } from "react"
import { BicepsFlexed, Percent, Plus, Scale } from "lucide-react"
import StatCard from "@/app/my/body-composition/StatCard"
import BodyCompositionChart from "@/app/my/body-composition/BodyCompositionChart"
import { BodyCompositionEditPage } from "@/app/my/body-composition/BodyCompositionEditPage"
import { BodyComposition, UserResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"

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
    const progress = rangeOptions.length === 1 ? 0 : (value / (rangeOptions.length - 1)) * 100

    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">표시 기간</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-600">
                    {rangeOptions[value].label}
                </span>
            </div>

            <div className="relative h-6">
                <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
                <div
                    className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue-500"
                    style={{ width: `${progress}%` }}
                />
                {rangeOptions.map((option, index) => {
                    const left = rangeOptions.length === 1 ? 0 : (index / (rangeOptions.length - 1)) * 100
                    const isActive = index <= value

                    return (
                        <button
                            type="button"
                            key={option.label}
                            aria-label={`${option.label} 표시`}
                            onClick={() => onChange(index)}
                            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors ${
                                isActive ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"
                            }`}
                            style={{ left: `${left}%` }}
                        />
                    )
                })}
                <div
                    className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-blue-600 shadow-md"
                    style={{ left: `${progress}%` }}
                />
                <input
                    type="range"
                    min={0}
                    max={rangeOptions.length - 1}
                    step={1}
                    value={value}
                    aria-label="체성분 그래프 표시 기간"
                    onChange={(event) => onChange(Number(event.target.value))}
                    className="absolute inset-0 h-6 w-full cursor-pointer opacity-0"
                />
            </div>

            <div className="mt-0.5 grid grid-cols-5 text-center text-[9px] font-bold text-slate-400">
                {rangeOptions.map((option) => (
                    <span key={option.label}>{option.label}</span>
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

    return (
        <div className="relative w-full bg-gray-50 px-1 pb-4">
            <h1 className="mb-4 text-lg font-bold text-gray-900">체성분 변화</h1>

            <section className="mb-4">
                <h2 className="mb-2 text-xs font-semibold text-gray-500">최신 측정 상태</h2>
                <div className="grid grid-cols-3 gap-2">
                    <StatCard
                        label="체중"
                        value={latestData.weight.value}
                        unit={latestData.weight.unit}
                        color="text-blue-600"
                        icon={<Scale className="h-full w-full" strokeWidth={1.8} />}
                        diff={latestData.weight.diff}
                    />
                    <StatCard
                        label="골격근량"
                        value={latestData.muscle.value}
                        unit={latestData.muscle.unit}
                        color="text-emerald-600"
                        icon={<BicepsFlexed className="h-full w-full" strokeWidth={1.8} />}
                        diff={latestData.muscle.diff}
                    />
                    <StatCard
                        label="체지방률"
                        value={latestData.fat.value}
                        unit={latestData.fat.unit}
                        color="text-rose-600"
                        icon={<Percent className="h-full w-full" strokeWidth={1.8} />}
                        diff={latestData.fat.diff}
                    />
                </div>
            </section>

            <section className="rounded-xl bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-gray-500">변화 추이</h2>
                    <span className="text-[11px] font-bold text-slate-400">{filteredSnapshots.length}개 기록</span>
                </div>
                <div className="mb-3">
                    <BodyCompositionRangeSlider value={rangeIndex} onChange={setRangeIndex} />
                </div>
                <BodyCompositionChart data={filteredSnapshots} weightUnit={weightUnit} />
            </section>

            <button
                type="button"
                aria-label="체성분 기록 추가"
                onClick={() => setIsEditing(true)}
                className="sticky bottom-4 left-full mt-4 flex rounded-full bg-blue-600 p-3.5 text-white shadow-lg transition-all hover:bg-blue-700"
            >
                <Plus size={24} />
            </button>
        </div>
    )
}
