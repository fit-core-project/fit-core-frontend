"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Activity, Bandage, ChevronDown, Dumbbell, Save } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import AnatomyModel from "@/app/components/AnatomyModel"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { useSettingsStore } from "@/store/settingsStore"
import type { PainArea, StrengthBaseline, UserResponse, UserUpdateRequest } from "@/types/project"
import { NUMERIC_RANGES, numericRules, toDisplayBound } from "@/utils/numericValidation"

const GOAL_OPTIONS = [
    { label: "근력 강화", value: "strength" },
    { label: "근비대", value: "hypertrophy" },
    { label: "체지방 감량", value: "fatLoss" },
    { label: "바디 리컴포지션", value: "recomposition" },
    { label: "건강 유지", value: "generalFitness" },
]

const SPLIT_OPTIONS = [
    { label: "전신", value: "fullBody" },
    { label: "상/하체 분할", value: "upperLower" },
    { label: "PPL", value: "pushPullLegs" },
    { label: "부위별 분할", value: "bodyPartSplit" },
    { label: "직접 설정", value: "custom" },
]

const EXP_OPTIONS = [
    { label: "초급", value: "beginner" },
    { label: "중급", value: "intermediate" },
    { label: "상급", value: "advanced" },
]

const EQUIPMENTS = [
    { label: "바벨", value: "BARBELL" },
    { label: "덤벨", value: "DUMBBELL" },
    { label: "머신", value: "MACHINE" },
    { label: "케이블", value: "CABLE" },
    { label: "맨몸", value: "BODYWEIGHT" },
]

const BIG_FOUR_BASELINE: StrengthBaseline[] = [
    { exerciseId: "75", exerciseNameSnapshot: "Barbell Overhead Press", workingWeightKg: 0, reps: 5 },
    { exerciseId: "30", exerciseNameSnapshot: "Barbell Bench Press", workingWeightKg: 0, reps: 5 },
    { exerciseId: "7", exerciseNameSnapshot: "Deadlift", workingWeightKg: 0, reps: 5 },
    { exerciseId: "98", exerciseNameSnapshot: "Back Squat", workingWeightKg: 0, reps: 5 },
]

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

const PAIN_AREA_LABELS: Record<string, string> = {
    quadriceps: "대퇴사두",
    hamstring: "햄스트링",
    gluteal: "둔근",
    trapezius: "승모근",
    "upper-back": "상부 등",
    "lower-back": "허리",
    adductor: "내전근",
    knees: "무릎",
    "right-soleus": "오른쪽 가자미근",
    "left-soleus": "왼쪽 가자미근",
    calves: "종아리",
    triceps: "삼두근",
    "back-deltoids": "후면 삼각근",
    forearm: "전완근",
    head: "머리",
    neck: "목",
    chest: "가슴",
    "front-deltoids": "전면 삼각근",
    biceps: "이두근",
    abs: "복근",
    obliques: "옆구리",
    abductors: "외전근",
}

const INPUT_CLS =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
const SELECT_CLS = `${INPUT_CLS} cursor-pointer appearance-none`

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
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({ mode: "onChange" })

    const loadSettings = useCallback(() => {
        setLoading(true)
        profileApiClient
            .getMe()
            .then((profile) => {
                const next = toWorkoutSettings(profile)
                setSettings(next)
                setDomsData(painAreasToDomsData(next.painAreas))
            })
            .catch(() => toast.error("운동 설정을 불러오지 못했습니다."))
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
        const isValid = await trigger()
        if (!isValid) return

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
            toast.success("운동 설정이 저장되었습니다.")
        } catch {
            toast.error("운동 설정 저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <section className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 h-5 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            </section>
        )
    }

    if (!settings) {
        return (
            <section className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-bold text-red-700">운동 설정을 불러오지 못했습니다.</p>
                <button type="button" onClick={loadSettings} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">
                    다시 시도
                </button>
            </section>
        )
    }

    return (
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <h2 className="text-base font-extrabold text-slate-800">운동 설정</h2>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        운동 목표, 경험 수준, 가능 요일과 장비 정보를 관리합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {saving ? "저장 중..." : "저장"}
                </button>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { label: "운동 목표", name: "goalType", options: GOAL_OPTIONS },
                        { label: "분할 방식", name: "splitType", options: SPLIT_OPTIONS },
                        { label: "운동 경력", name: "experienceLevel", options: EXP_OPTIONS },
                    ].map((field) => (
                        <label key={field.name} className="block space-y-1">
                            <span className="text-xs font-semibold text-slate-500">{field.label}</span>
                            <span className="relative block">
                                <select
                                    value={String(settings[field.name as keyof WorkoutSettingsForm])}
                                    onChange={(event) => updateSettings({ [field.name]: event.target.value } as Partial<WorkoutSettingsForm>)}
                                    className={SELECT_CLS}
                                >
                                    {field.options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </span>
                        </label>
                    ))}

                    <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">주당 운동 횟수</span>
                        <input
                            type="number"
                            min={1}
                            max={7}
                            value={String(settings.trainingDaysPerWeek)}
                            onChange={(event) =>
                                updateSettings({ trainingDaysPerWeek: Math.max(1, Math.min(7, Number(event.target.value) || 1)) })
                            }
                            className={INPUT_CLS}
                        />
                    </label>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">운동 가능 요일</p>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                            <button
                                key={day.value}
                                type="button"
                                onClick={() => handleDayToggle(day.value)}
                                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                                    settings.availableDays.includes(day.value)
                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4 text-slate-500" />
                        <p className="text-xs font-semibold text-slate-500">사용 가능한 장비</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENTS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => handleEquipmentToggle(item.value)}
                                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                                    settings.equipmentAccess.includes(item.value)
                                        ? "border-slate-600 bg-slate-800 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-slate-600" />
                        <h3 className="text-sm font-bold text-slate-800">4대 운동 기준 중량</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {settings.strengthBaseline.map((item, index) => {
                            const weightField = `strengthBaseline.${index}.workingWeightKg`
                            const repsField = `strengthBaseline.${index}.reps`
                            const weightRegister = register(weightField, numericRules("workingWeightKg", weightUnit))
                            const repsRegister = register(repsField, numericRules("reps"))
                            const baselineErrors = errors.strengthBaseline as
                                | Array<{ workingWeightKg?: { message?: unknown }; reps?: { message?: unknown } }>
                                | undefined

                            return (
                                <div key={item.exerciseId} className="rounded-xl border border-slate-100 bg-white p-3">
                                    <p className="mb-2 text-sm font-bold text-slate-700">
                                        {BIG_FOUR_LABELS[item.exerciseId] ?? item.exerciseNameSnapshot}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="block space-y-1">
                                            <span className="text-xs font-semibold text-slate-500">중량 {weightUnit}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={toDisplayBound(NUMERIC_RANGES.workingWeightKg.max, weightUnit)}
                                                step={NUMERIC_RANGES.workingWeightKg.step}
                                                value={
                                                    weightUnit === "lbs"
                                                        ? +(item.workingWeightKg * 2.20462).toFixed(1)
                                                        : item.workingWeightKg
                                                }
                                                onChange={(event) => {
                                                    weightRegister.onChange(event)
                                                    const raw = event.target.value
                                                    const inKg = weightUnit === "lbs" ? String(Number(raw) / 2.20462) : raw
                                                    handleStrengthBaselineChange(item.exerciseId, "workingWeightKg", inKg)
                                                    void trigger(weightField)
                                                }}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            />
                                            {Boolean(baselineErrors?.[index]?.workingWeightKg?.message) && (
                                                <p className="text-xs text-red-600">
                                                    {String(baselineErrors?.[index]?.workingWeightKg?.message)}
                                                </p>
                                            )}
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-xs font-semibold text-slate-500">반복</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={NUMERIC_RANGES.reps.max}
                                                step={NUMERIC_RANGES.reps.step}
                                                value={item.reps}
                                                onChange={(event) => {
                                                    repsRegister.onChange(event)
                                                    handleStrengthBaselineChange(item.exerciseId, "reps", event.target.value)
                                                    void trigger(repsField)
                                                }}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            />
                                            {Boolean(baselineErrors?.[index]?.reps?.message) && (
                                                <p className="text-xs text-red-600">
                                                    {String(baselineErrors?.[index]?.reps?.message)}
                                                </p>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50/30 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <Bandage className="h-5 w-5 text-red-400" />
                        <h3 className="text-sm font-bold text-slate-800">부상 및 관리 부위</h3>
                    </div>
                    <AnatomyModel data={domsData} onMuscleClick={handleMuscleClick} mode="injury" />

                    {settings.painAreas.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {settings.painAreas.map((item) => (
                                    <span
                                        key={item.area}
                                        className="rounded-full border border-red-500 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700"
                                    >
                                        {PAIN_AREA_LABELS[item.area] || item.area}
                                    </span>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsExpanded((prev) => !prev)}
                                className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                            >
                                관리 부위 메모
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>

                            {isExpanded && (
                                <div className="space-y-2">
                                    {settings.painAreas.map((item) => (
                                        <input
                                            key={item.area}
                                            type="text"
                                            placeholder={`${PAIN_AREA_LABELS[item.area] || item.area} 부상 설명`}
                                            value={item.note}
                                            onChange={(event) => handleNoteChange(item.area, event.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
