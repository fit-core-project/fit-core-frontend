"use client"

import { useMemo, useState } from "react"
import { BicepsFlexed, Pencil, Percent, Plus, Scale, Trash2 } from "lucide-react"
import StatCard from "@/app/my/body-composition/StatCard"
import BodyCompositionChart from "@/app/my/body-composition/BodyCompositionChart"
import { BodyCompositionEditPage } from "@/app/my/body-composition/BodyCompositionEditPage"
import { BodyComposition, UserResponse } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"
import { Button, EmptyState, Section, Sheet, Surface, ToggleChip } from "@/components/ui"
import { type BodyCompositionRef, sortBodyCompositions } from "@/app/my/body-composition/bodyCompositionList"

interface Props {
    profile: UserResponse | null
    onSave: (formData: BodyComposition) => Promise<boolean>
    onUpdate: (ref: BodyCompositionRef, formData: BodyComposition) => Promise<boolean>
    onDelete: (ref: BodyCompositionRef) => Promise<boolean>
}

type EditTarget = { mode: "add" } | { mode: "edit"; ref: BodyCompositionRef; record: BodyComposition }

const RECORD_PREVIEW_COUNT = 5

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

function formatRecordDate(value?: string) {
    if (!value) return "날짜 없음"
    const [year, month, day] = value.split("-")
    return year && month && day ? `${year}.${month}.${day}` : value
}

function recordSummary(record: BodyComposition, unit: "kg" | "lbs") {
    const parts: string[] = []
    const weight = kgToDisplay(record.bodyWeightKg, unit)
    const muscle = kgToDisplay(record.skeletalMuscleMassKg, unit)
    if (weight != null) parts.push(`체중 ${weight.toFixed(1)}${unit}`)
    if (muscle != null) parts.push(`골격근 ${muscle.toFixed(1)}${unit}`)
    if (record.bodyFatPct != null) parts.push(`체지방률 ${record.bodyFatPct.toFixed(1)}%`)
    return parts.length > 0 ? parts.join(" · ") : "기타 측정값만 있어요"
}

export default function BodyCompositionPage({ profile, onSave, onUpdate, onDelete }: Props) {
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ ref: BodyCompositionRef; record: BodyComposition } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [showAllRecords, setShowAllRecords] = useState(false)
    const [rangeIndex, setRangeIndex] = useState(2)
    const { weightUnit } = useSettingsStore()
    // Sorted newest first; record refs (index + measuredAt) are positions in this list.
    const snapshots = useMemo(() => sortBodyCompositions(profile?.bodyCompositionSnapshot), [profile?.bodyCompositionSnapshot])
    // Until the profile loads the stored list is unknown, so adding is disabled (it would replace the history).
    const profileLoaded = profile !== null
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
        if (!editTarget) return
        const saved = editTarget.mode === "edit" ? await onUpdate(editTarget.ref, formData) : await onSave(formData)
        if (saved) setEditTarget(null)
    }

    const confirmDelete = async () => {
        if (!deleteTarget || deleting) return
        setDeleting(true)
        try {
            // On failure the parent shows a toast and the sheet stays open for a retry; the list is untouched.
            if (await onDelete(deleteTarget.ref)) setDeleteTarget(null)
        } finally {
            setDeleting(false)
        }
    }

    if (editTarget) {
        return (
            <BodyCompositionEditPage
                key={editTarget.mode === "edit" ? `edit-${editTarget.ref.index}` : "add"}
                initialValue={editTarget.mode === "edit" ? editTarget.record : undefined}
                onCancel={() => setEditTarget(null)}
                onSave={saveTrack}
            />
        )
    }

    const visibleRecords = showAllRecords ? snapshots : snapshots.slice(0, RECORD_PREVIEW_COUNT)

    const addButton = (
        <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditTarget({ mode: "add" })}>
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
                            <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} disabled={!profileLoaded} onClick={() => setEditTarget({ mode: "add" })}>
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

                    <Surface className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-body font-bold text-ink">측정 기록</h3>
                            <span className="text-caption tabular-nums text-ink-2">전체 {snapshots.length}개</span>
                        </div>
                        <ul className="flex flex-col divide-y divide-hairline">
                            {visibleRecords.map((record, index) => {
                                const ref: BodyCompositionRef = { index, measuredAt: record.measuredAt }
                                const dateLabel = formatRecordDate(record.measuredAt)
                                return (
                                    <li key={`${record.measuredAt ?? "none"}-${index}`} className="flex items-center gap-2 py-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-body-sm font-bold tabular-nums text-ink">{dateLabel}</p>
                                            <p className="truncate text-caption tabular-nums text-ink-2">{recordSummary(record, weightUnit)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="w-11 shrink-0 px-0"
                                            aria-label={`${dateLabel} 기록 수정`}
                                            icon={<Pencil className="size-4" aria-hidden />}
                                            onClick={() => setEditTarget({ mode: "edit", ref, record })}
                                        />
                                        <Button
                                            variant="danger-ghost"
                                            className="w-11 shrink-0 px-0"
                                            aria-label={`${dateLabel} 기록 삭제`}
                                            icon={<Trash2 className="size-4" aria-hidden />}
                                            onClick={() => setDeleteTarget({ ref, record })}
                                        />
                                    </li>
                                )
                            })}
                        </ul>
                        {snapshots.length > RECORD_PREVIEW_COUNT && (
                            <Button variant="ghost" block aria-expanded={showAllRecords} onClick={() => setShowAllRecords((v) => !v)}>
                                {showAllRecords ? "접기" : `기록 ${snapshots.length - RECORD_PREVIEW_COUNT}개 더 보기`}
                            </Button>
                        )}
                    </Surface>
                </>
            )}

            <Sheet
                open={deleteTarget !== null}
                onClose={() => {
                    if (!deleting) setDeleteTarget(null)
                }}
                title="이 기록을 삭제할까요?"
                description="삭제한 체성분 기록은 되살릴 수 없어요."
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                            취소
                        </Button>
                        <Button variant="danger" size="lg" loading={deleting} onClick={confirmDelete}>
                            삭제
                        </Button>
                    </div>
                }
            >
                {deleteTarget && (
                    <p className="text-body-sm tabular-nums text-ink-2">
                        {formatRecordDate(deleteTarget.record.measuredAt)} · {recordSummary(deleteTarget.record, weightUnit)}
                    </p>
                )}
            </Sheet>
        </Section>
    )
}
