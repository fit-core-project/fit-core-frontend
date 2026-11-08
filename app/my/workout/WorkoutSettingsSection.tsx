"use client"

import React, { useCallback, useEffect, useState } from "react"
import { ChevronDown, Save } from "lucide-react"
import { toast } from "sonner"
import AnatomyModel from "@/app/components/AnatomyModel"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { useSettingsStore } from "@/store/settingsStore"
import type { PainArea, StrengthBaseline, UserResponse, UserUpdateRequest } from "@/types/project"
import { NUMERIC_RANGES, toDisplayBound, validateNumericRange } from "@/utils/numericValidation"
import { equipmentLabel, experienceLabel, goalLabel, muscleLabel } from "@/utils/displayLabels"
import { Button, Notice, Skeleton, Tag, TextField, ToggleChip } from "@/components/ui"

const GOAL_OPTIONS = ["strength", "hypertrophy", "fatLoss", "recomposition", "generalFitness"].map((value) => ({
    label: goalLabel(value),
    value,
}))

const SPLIT_OPTIONS = [
    { label: "전신", value: "fullBody" },
    { label: "상/하체 분할", value: "upperLower" },
    { label: "PPL", value: "pushPullLegs" },
    { label: "부위별 분할", value: "bodyPartSplit" },
    { label: "직접 설정", value: "custom" },
]

const EXP_OPTIONS = ["beginner", "intermediate", "advanced"].map((value) => ({ label: experienceLabel(value), value }))

const EQUIPMENTS = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"]

const BIG_FOUR_BASELINE: StrengthBaseline[] = [
    { exerciseId: "75", exerciseNameSnapshot: "Barbell Overhead Press", workingWeightKg: 0, reps: 5 },
    { exerciseId: "30", exerciseNameSnapshot: "Barbell Bench Press", workingWeightKg: 0, reps: 5 },
    { exerciseId: "7", exerciseNameSnapshot: "Deadlift", workingWeightKg: 0, reps: 5 },
    { exerciseId: "98", exerciseNameSnapshot: "Back Squat", workingWeightKg: 0, reps: 5 },
]

/** A baseline weight of 0 means "not entered" and is allowed; any entered weight must be in range. */
function baselineIssue(item: StrengthBaseline, unit: "kg" | "lbs"): { weight?: string; reps?: string } {
    const display = unit === "lbs" ? +(item.workingWeightKg * 2.20462).toFixed(1) : item.workingWeightKg
    const weightResult = item.workingWeightKg === 0 ? true : validateNumericRange("workingWeightKg", display, unit)
    const repsResult = validateNumericRange("reps", item.reps)
    return {
        weight: weightResult === true ? undefined : String(weightResult),
        reps: repsResult === true ? undefined : String(repsResult),
    }
}

const BIG_FOUR_LABELS: Record<string, string> = {
    "75": "오버헤드프레스",
    "30": "벤치프레스",
    "7": "데드리프트",
    "98": "스쿼트",
}

const DAYS_OF_WEEK = [
    { label: "월", value: "MON" },
    { label: "화", value: "TUE" },
    { label: "수", value: "WED" },
    { label: "목", value: "THU" },
    { label: "금", value: "FRI" },
    { label: "토", value: "SAT" },
    { label: "일", value: "SUN" },
]


interface WorkoutSettingsForm {
    goalType: UserResponse["goalType"]
    splitType: UserResponse["splitType"]
    experienceLevel: UserResponse["experienceLevel"]
    trainingDaysPerWeek: number
    availableDays: string[]
    equipmentAccess: string[]
    painAreas: PainArea[]
    strengthBaseline: StrengthBaseline[]
}

function mergeBigFourBaseline(existing?: StrengthBaseline[] | null): StrengthBaseline[] {
    const byId = new Map((existing || []).map((item) => [String(item.exerciseId), item]))
    return BIG_FOUR_BASELINE.map((base) => ({
        ...base,
        ...byId.get(base.exerciseId),
        exerciseId: base.exerciseId,
        exerciseNameSnapshot: byId.get(base.exerciseId)?.exerciseNameSnapshot || base.exerciseNameSnapshot,
    }))
}

function toWorkoutSettings(profile: UserResponse): WorkoutSettingsForm {
    return {
        goalType: profile.goalType || "strength",
        splitType: profile.splitType || "fullBody",
        experienceLevel: profile.experienceLevel || "beginner",
        trainingDaysPerWeek: profile.trainingDaysPerWeek || 3,
        availableDays: profile.availableDays || [],
        equipmentAccess: profile.equipmentAccess || [],
        painAreas: profile.painAreas || [],
        strengthBaseline: mergeBigFourBaseline(profile.strengthBaseline),
    }
}

function painAreasToDomsData(painAreas: PainArea[]): Record<string, number> {
    return painAreas.reduce<Record<string, number>>((acc, item) => {
        acc[item.area] = 1
        return acc
    }, {})
}

export default function WorkoutSettingsSection() {
    const { weightUnit } = useSettingsStore()
    const [settings, setSettings] = useState<WorkoutSettingsForm | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const [domsData, setDomsData] = useState<Record<string, number>>({})
    const [baselineTouched, setBaselineTouched] = useState<Set<string>>(new Set())
    const [saveAttempted, setSaveAttempted] = useState(false)

    const loadSettings = useCallback(() => {
        setLoading(true)
        profileApiClient
            .getMe()
            .then((profile) => {
                const next = toWorkoutSettings(profile)
                setSettings(next)
                setDomsData(painAreasToDomsData(next.painAreas))
            })
            .catch(() => toast.error("운동 설정을 불러오지 못했어요."))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    const updateSettings = (patch: Partial<WorkoutSettingsForm>) => {
        setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
    }

    const handleDayToggle = (day: string) => {
        setSettings((prev) => {
            if (!prev) return prev
            const selected = prev.availableDays.includes(day)
            return {
                ...prev,
                availableDays: selected ? prev.availableDays.filter((item) => item !== day) : [...prev.availableDays, day],
            }
        })
    }

    const handleEquipmentToggle = (equipment: string) => {
        setSettings((prev) => {
            if (!prev) return prev
            const selected = prev.equipmentAccess.includes(equipment)
            return {
                ...prev,
                equipmentAccess: selected
                    ? prev.equipmentAccess.filter((item) => item !== equipment)
                    : [...prev.equipmentAccess, equipment],
            }
        })
    }

    const handleMuscleClick = (muscleName: string) => {
        setDomsData((prev) => {
            const next = { ...prev }
            if (next[muscleName]) delete next[muscleName]
            else next[muscleName] = 1
            return next
        })

        setSettings((prev) => {
            if (!prev) return prev
            const exists = prev.painAreas.some((item) => item.area === muscleName)
            return {
                ...prev,
                painAreas: exists
                    ? prev.painAreas.filter((item) => item.area !== muscleName)
                    : [...prev.painAreas.filter((item) => item.area !== muscleName), { area: muscleName, note: "" }],
            }
        })
    }

    const handleNoteChange = (area: string, note: string) => {
        setSettings((prev) =>
            prev
                ? {
                      ...prev,
                      painAreas: prev.painAreas.map((item) => (item.area === area ? { ...item, note } : item)),
                  }
                : prev,
        )
    }

    const handleStrengthBaselineChange = (
        exerciseId: string,
        field: "workingWeightKg" | "reps",
        value: string,
    ) => {
        const numericValue = value === "" ? 0 : Math.max(0, Number(value))
        setSettings((prev) =>
            prev
                ? {
                      ...prev,
                      strengthBaseline: prev.strengthBaseline.map((item) =>
                          item.exerciseId === exerciseId ? { ...item, [field]: numericValue } : item,
                      ),
                  }
                : prev,
        )
    }

    const handleSave = async () => {
        if (!settings) return
        setSaveAttempted(true)
        if (settings.strengthBaseline.some((item) => baselineIssue(item, weightUnit).weight || baselineIssue(item, weightUnit).reps)) return

        setSaving(true)
        const request: UserUpdateRequest = {
            goalType: settings.goalType,
            splitType: settings.splitType,
            experienceLevel: settings.experienceLevel,
            trainingDaysPerWeek: settings.trainingDaysPerWeek,
            availableDays: settings.availableDays,
            equipmentAccess: settings.equipmentAccess,
            painAreas: settings.painAreas,
            strengthBaseline: settings.strengthBaseline,
        }

        try {
            const saved = await profileApiClient.updateMe(request)
            const next = toWorkoutSettings(saved)
            setSettings(next)
            setDomsData(painAreasToDomsData(next.painAreas))
            toast.success("운동 설정을 저장했어요.")
        } catch {
            toast.error("운동 설정을 저장하지 못했어요. 잠시 뒤 다시 저장하세요.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-4" aria-busy="true">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="flex flex-col gap-3">
                <Notice tone="danger" title="운동 설정을 불러오지 못했어요">
                    네트워크 연결을 확인하고 다시 불러오세요.
                </Notice>
                <Button variant="secondary" className="self-start" onClick={loadSettings}>
                    다시 불러오기
                </Button>
            </div>
        )
    }

    return (
        <section aria-labelledby="workout-settings-title" className="flex flex-col gap-7">
            <div>
                <h2 id="workout-settings-title" className="text-title-sm font-bold text-ink">
                    운동 설정
                </h2>
                <p className="mt-0.5 text-body-sm text-ink-2">AI 루틴이 목표, 경력, 요일, 장비, 기준 중량을 참고해요.</p>
            </div>

            {[
                { label: "운동 목표", name: "goalType" as const, options: GOAL_OPTIONS },
                { label: "분할 방식", name: "splitType" as const, options: SPLIT_OPTIONS },
                { label: "운동 경력", name: "experienceLevel" as const, options: EXP_OPTIONS },
            ].map((field) => (
                <ChipGroup key={field.name} legend={field.label}>
                    {field.options.map((option) => (
                        <ToggleChip
                            key={option.value}
                            pressed={settings[field.name] === option.value}
                            onClick={() => updateSettings({ [field.name]: option.value } as Partial<WorkoutSettingsForm>)}
                        >
                            {option.label}
                        </ToggleChip>
                    ))}
                </ChipGroup>
            ))}

            <TextField
                label="주당 운동 횟수"
                type="number"
                inputMode="numeric"
                min={1}
                max={7}
                suffix="회"
                hint="1회부터 7회까지 정할 수 있어요."
                value={String(settings.trainingDaysPerWeek)}
                onChange={(event) =>
                    updateSettings({ trainingDaysPerWeek: Math.max(1, Math.min(7, Number(event.target.value) || 1)) })
                }
            />

            <ChipGroup legend="운동 가능 요일" hint="여러 날을 고를 수 있어요.">
                {DAYS_OF_WEEK.map((day) => (
                    <ToggleChip
                        key={day.value}
                        pressed={settings.availableDays.includes(day.value)}
                        onClick={() => handleDayToggle(day.value)}
                        aria-label={`${day.label}요일`}
                        className="min-w-11"
                    >
                        {day.label}
                    </ToggleChip>
                ))}
            </ChipGroup>

            <ChipGroup legend="사용 가능한 장비" hint="여러 개를 고를 수 있어요.">
                {EQUIPMENTS.map((code) => (
                    <ToggleChip key={code} pressed={settings.equipmentAccess.includes(code)} onClick={() => handleEquipmentToggle(code)}>
                        {equipmentLabel(code)}
                    </ToggleChip>
                ))}
            </ChipGroup>

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-body font-bold text-ink">4대 운동 기준 중량</legend>
                <p className="text-body-sm text-ink-2">평소 작업 세트 기준으로 적어 주세요. 첫 루틴 중량을 정할 때 써요.</p>
                <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
                    {settings.strengthBaseline.map((item) => {
                        const weightKey = `${item.exerciseId}.weight`
                        const repsKey = `${item.exerciseId}.reps`
                        const name = BIG_FOUR_LABELS[item.exerciseId] ?? item.exerciseNameSnapshot
                        const issue = baselineIssue(item, weightUnit)
                        const showWeightError = saveAttempted || baselineTouched.has(weightKey)
                        const showRepsError = saveAttempted || baselineTouched.has(repsKey)
                        const weightError = showWeightError ? issue.weight : undefined
                        const repsError = showRepsError ? issue.reps : undefined
                        const touch = (key: string) => setBaselineTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))

                        return (
                            <li key={item.exerciseId} className="flex flex-col gap-2 py-3">
                                <p className="text-body font-medium text-ink">{name}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <TextField
                                        label={`${name} 중량`}
                                        type="number"
                                        inputMode="decimal"
                                        suffix={weightUnit}
                                        min={0}
                                        max={toDisplayBound(NUMERIC_RANGES.workingWeightKg.max, weightUnit)}
                                        step={NUMERIC_RANGES.workingWeightKg.step}
                                        value={
                                            weightUnit === "lbs"
                                                ? +(item.workingWeightKg * 2.20462).toFixed(1)
                                                : item.workingWeightKg
                                        }
                                        onChange={(event) => {
                                            const raw = event.target.value
                                            const inKg = weightUnit === "lbs" ? String(Number(raw) / 2.20462) : raw
                                            handleStrengthBaselineChange(item.exerciseId, "workingWeightKg", inKg)
                                            touch(weightKey)
                                        }}
                                        error={weightError}
                                    />
                                    <TextField
                                        label={`${name} 반복`}
                                        type="number"
                                        inputMode="numeric"
                                        suffix="회"
                                        min={1}
                                        max={NUMERIC_RANGES.reps.max}
                                        step={NUMERIC_RANGES.reps.step}
                                        value={item.reps}
                                        onChange={(event) => {
                                            handleStrengthBaselineChange(item.exerciseId, "reps", event.target.value)
                                            touch(repsKey)
                                        }}
                                        error={repsError}
                                    />
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-body font-bold text-ink">부상·관리 부위</legend>
                <p className="text-body-sm text-ink-2">그림에서 아픈 부위를 누르면 그 부위에 부담이 큰 운동을 줄여요.</p>
                <AnatomyModel data={domsData} onMuscleClick={handleMuscleClick} mode="injury" />

                {settings.painAreas.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <ul className="flex flex-wrap gap-1.5" aria-label="선택한 관리 부위">
                            {settings.painAreas.map((item) => (
                                <li key={item.area}>
                                    <Tag tone="danger">{muscleLabel(item.area)}</Tag>
                                </li>
                            ))}
                        </ul>

                        <Button
                            variant="ghost"
                            className="-mx-2 self-start"
                            aria-expanded={isExpanded}
                            aria-controls="pain-area-notes"
                            onClick={() => setIsExpanded((prev) => !prev)}
                            icon={
                                <ChevronDown
                                    className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
                                    aria-hidden
                                />
                            }
                        >
                            {isExpanded ? "부위 메모 접기" : "부위 메모 쓰기"}
                        </Button>

                        {isExpanded && (
                            <div id="pain-area-notes" className="flex flex-col gap-3">
                                {settings.painAreas.map((item) => (
                                    <TextField
                                        key={item.area}
                                        label={`${muscleLabel(item.area)} 메모`}
                                        optional
                                        placeholder="예: 무거운 중량에서 찌릿해요"
                                        value={item.note}
                                        onChange={(event) => handleNoteChange(item.area, event.target.value)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </fieldset>

            <Button variant="primary" size="lg" block loading={saving} icon={<Save className="size-4" aria-hidden />} onClick={handleSave}>
                {saving ? "저장하는 중" : "운동 설정 저장하기"}
            </Button>
        </section>
    )
}

function ChipGroup({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body-sm font-medium text-ink">{legend}</legend>
            {hint && <p className="-mt-1 text-caption text-ink-2">{hint}</p>}
            <div className="flex flex-wrap gap-2">{children}</div>
        </fieldset>
    )
}
