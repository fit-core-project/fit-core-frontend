"use client"

import React, { useEffect, useState } from "react"
import { StrengthBaseline, UserResponse } from "@/types/project"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { Activity, Bandage, ChevronDown, Dumbbell, User } from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel"
import { useSettingsStore } from "@/store/settingsStore"
import { useForm } from "react-hook-form"
import { NUMERIC_RANGES, numericRules, toDisplayBound } from "@/utils/numericValidation"
import { toast } from "sonner"

const GOAL_OPTIONS: { label: string; value: string }[] = [
    { label: "근력 강화", value: "strength" },
    { label: "근비대", value: "hypertrophy" },
    { label: "체지방 감량", value: "fatLoss" },
    { label: "바디 리컴포지션", value: "recomposition" },
    { label: "건강 유지", value: "generalFitness" },
]

const SPLIT_OPTIONS: { label: string; value: string }[] = [
    { label: "전신", value: "fullBody" },
    { label: "상/하체 분할", value: "upperLower" },
    { label: "PPL (밀기/당기기/하체)", value: "pushPullLegs" },
    { label: "부위별 분할", value: "bodyPartSplit" },
    { label: "직접 설정", value: "custom" },
]

const EXP_OPTIONS: { label: string; value: string }[] = [
    { label: "초급", value: "beginner" },
    { label: "중급", value: "intermediate" },
    { label: "상급", value: "advanced" },
]

const GENDER_OPTIONS: { label: string; value: string }[] = [
    { label: "남성", value: "MALE" },
    { label: "여성", value: "FEMALE" },
    { label: "선택 안 함", value: "NONE" },
]

const EQUIPMENTS: { label: string; value: string }[] = [
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

function mergeBigFourBaseline(existing?: StrengthBaseline[] | null): StrengthBaseline[] {
    const byId = new Map((existing || []).map((item) => [String(item.exerciseId), item]))
    return BIG_FOUR_BASELINE.map((base) => ({
        ...base,
        ...byId.get(base.exerciseId),
        exerciseId: base.exerciseId,
        exerciseNameSnapshot: byId.get(base.exerciseId)?.exerciseNameSnapshot || base.exerciseNameSnapshot,
    }))
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
    quadriceps: "허벅지 앞",
    hamstring: "햄스트링",
    gluteal: "둔근",
    trapezius: "승모근",
    "upper-back": "등(상부)",
    "lower-back": "허리",
    adductor: "내전근",
    knees: "무릎",
    "right-soleus": "오른 가자미근",
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

const INPUT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
const SELECT_CLS = `${INPUT_CLS} appearance-none cursor-pointer`

interface ProfileEditFormProps {
    initialProfile: UserResponse | null
    onSave: (updateProfile: Partial<UserResponse>) => void
    onCancel: () => void
}

export default function ProfileEditForm({ initialProfile, onSave, onCancel }: ProfileEditFormProps) {
    const { weightUnit } = useSettingsStore()
    const [formData, setFormData] = useState({
        name: initialProfile?.name || "",
        nickname: initialProfile?.nickname || "",
        gender: initialProfile?.gender || "NONE",
        birthDate: initialProfile?.birthDate ? String(initialProfile?.birthDate).split("T")[0] : "",
        notes: initialProfile?.notes || "",
        goalType: initialProfile?.goalType || "strength",
        splitType: initialProfile?.splitType || "fullBody",
        experienceLevel: initialProfile?.experienceLevel || "beginner",
        trainingDaysPerWeek: initialProfile?.trainingDaysPerWeek || 3,
        bodyWeightKg: initialProfile?.bodyWeightKg || 0,
        bodyFatPct: initialProfile?.bodyFatPct || 0,
        splitLabel: initialProfile?.splitLabel || "",
        availableDays: initialProfile?.availableDays || [],
        equipmentAccess: initialProfile?.equipmentAccess || [],
        painAreas: initialProfile?.painAreas || [],
        strengthBaseline: mergeBigFourBaseline(initialProfile?.strengthBaseline),
    })
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate">("idle")
    const [domsData, setDomsData] = useState<Record<string, number>>(() => {
        if (!initialProfile?.painAreas) return {}
        return initialProfile.painAreas.reduce(
            (acc, curr) => {
                acc[curr.area] = 1
                return acc
            },
            {} as Record<string, number>
        )
    })
    const [isExpanded, setIsExpanded] = useState(true)
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({ mode: "onChange" })

    useEffect(() => {
        const timer = setTimeout(async () => {
            const trimmedNickname = formData.nickname.trim()
            if (trimmedNickname === initialProfile?.nickname || trimmedNickname === "") {
                setNicknameStatus("idle")
                return
            }
            setNicknameStatus("checking")
            try {
                const res = await profileApiClient.checkNickname(trimmedNickname)
                setNicknameStatus(res ? "duplicate" : "available")
            } catch {
                setNicknameStatus("idle")
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData.nickname, initialProfile?.nickname])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const isValid = await trigger()
        if (!isValid) return

        if (!formData.nickname || formData.nickname.trim() === "") {
            toast.error("닉네임을 입력해주세요.")
            return
        }

        if (formData.nickname !== initialProfile?.nickname) {
            try {
                const res = await profileApiClient.checkNickname(formData.nickname)
                if (res) {
                    setNicknameStatus("duplicate")
                    toast.error("이미 사용 중인 닉네임입니다. 다시 확인해 주세요.")
                    return
                }
            } catch {
                toast.error("중복 확인 중 오류가 발생했습니다.")
                return
            }
        }

        onSave(formData)
    }

    const bodyFatPctRegister = register("bodyFatPct", numericRules("bodyFatPct"))
    const bodyWeightRegister = register("bodyWeightKg", numericRules("bodyWeightKg", weightUnit))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        const finalValue = type === "number" ? (value === "" ? 0 : parseFloat(value)) : value
        setFormData((prev) => ({ ...prev, [name]: finalValue }))
    }

    const handleEquipmentToggle = (value: string) => {
        setFormData((prev) => {
            const currentList = prev.equipmentAccess
            const isSelected = currentList.includes(value)
            return {
                ...prev,
                equipmentAccess: isSelected ? currentList.filter((item) => item !== value) : [...currentList, value],
            }
        })
    }

    const handleDayToggle = (day: string) => {
        setFormData((prev) => {
            const isSelected = prev.availableDays.includes(day)
            return {
                ...prev,
                availableDays: isSelected ? prev.availableDays.filter((d) => d !== day) : [...prev.availableDays, day],
            }
        })
    }

    const handleMuscleClick = (muscleName: string) => {
        setDomsData((prev) => {
            const newData = { ...prev }
            const isSelected = !!newData[muscleName]
            if (isSelected) {
                delete newData[muscleName]
            } else {
                newData[muscleName] = 1
            }
            return newData
        })

        setFormData((prev) => {
            const exists = prev.painAreas.some((p) => p.area === muscleName)
            if (exists) {
                return { ...prev, painAreas: prev.painAreas.filter((p) => p.area !== muscleName) }
            } else {
                const cleanList = prev.painAreas.filter((p) => p.area !== muscleName)
                return { ...prev, painAreas: [...cleanList, { area: muscleName, note: "" }] }
            }
        })
    }

    const handleNoteChange = (area: string, note: string) => {
        setFormData((prev) => ({
            ...prev,
            painAreas: prev.painAreas.map((p) => (p.area === area ? { ...p, note } : p)),
        }))
    }

    const handleStrengthBaselineChange = (
        exerciseId: string,
        field: "workingWeightKg" | "reps",
        value: string
    ) => {
        const numericValue = value === "" ? 0 : Math.max(0, Number(value))
        setFormData((prev) => ({
            ...prev,
            strengthBaseline: prev.strengthBaseline.map((item) =>
                item.exerciseId === exerciseId ? { ...item, [field]: numericValue } : item
            ),
        }))
    }

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-4">

            {/* Section 1: 계정 및 기본 신체 정보 */}
            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-800">계정 및 기본 신체 정보</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {/* 닉네임 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-slate-500">닉네임</label>
                        <input
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleChange}
                            className={INPUT_CLS}
                            placeholder="사용할 닉네임"
                        />
                        <div className="h-4 text-xs">
                            {nicknameStatus === "checking" && <span className="text-slate-400">중복 확인 중...</span>}
                            {nicknameStatus === "available" && <span className="text-green-600">사용 가능한 닉네임입니다.</span>}
                            {nicknameStatus === "duplicate" && <span className="text-red-600">이미 사용 중인 닉네임입니다.</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 생년월일 */}
                        <div className="space-y-0.5">
                            <label className="text-xs font-semibold text-slate-500">생년월일</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className={INPUT_CLS}
                            />
                        </div>

                        {/* 성별 */}
                        <div className="space-y-0.5">
                            <label className="text-xs font-semibold text-slate-500">성별</label>
                            <div className="relative">
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className={SELECT_CLS}
                                >
                                    {GENDER_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 체중 */}
                        <div className="space-y-0.5">
                            <label className="text-xs font-semibold text-slate-500">체중 ({weightUnit})</label>
                            <input
                                type="number"
                                name="bodyWeightKg"
                                min={toDisplayBound(NUMERIC_RANGES.bodyWeightKg.min, weightUnit)}
                                max={toDisplayBound(NUMERIC_RANGES.bodyWeightKg.max, weightUnit)}
                                step={NUMERIC_RANGES.bodyWeightKg.step}
                                value={
                                    formData.bodyWeightKg
                                        ? weightUnit === "lbs"
                                            ? +(formData.bodyWeightKg * 2.20462).toFixed(1)
                                            : formData.bodyWeightKg
                                        : ""
                                }
                                onChange={(e) => {
                                    bodyWeightRegister.onChange(e)
                                    const raw = parseFloat(e.target.value)
                                    const inKg = isNaN(raw) ? 0 : weightUnit === "lbs" ? raw / 2.20462 : raw
                                    setFormData((prev) => ({ ...prev, bodyWeightKg: inKg }))
                                    void trigger("bodyWeightKg")
                                }}
                                className={INPUT_CLS}
                            />
                            {errors.bodyWeightKg?.message && (
                                <p className="text-xs text-red-600">{String(errors.bodyWeightKg.message)}</p>
                            )}
                        </div>

                        {/* 체지방률 */}
                        <div className="space-y-0.5">
                            <label className="text-xs font-semibold text-slate-500">체지방률 (%)</label>
                            <input
                                type="number"
                                name="bodyFatPct"
                                min={NUMERIC_RANGES.bodyFatPct.min}
                                max={NUMERIC_RANGES.bodyFatPct.max}
                                step={NUMERIC_RANGES.bodyFatPct.step}
                                value={String(formData.bodyFatPct)}
                                onChange={(e) => {
                                    bodyFatPctRegister.onChange(e)
                                    void trigger("bodyFatPct")
                                    handleChange(e)
                                }}
                                className={INPUT_CLS}
                            />
                            {errors.bodyFatPct?.message && (
                                <p className="text-xs text-red-600">{String(errors.bodyFatPct.message)}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: 피트니스 설정 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-600" />
                    <h2 className="text-base font-bold text-slate-800">피트니스 설정</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {/* 운동 목표 / 분할 방식 / 경력 */}
                    {[
                        { label: "운동 목표", name: "goalType", options: GOAL_OPTIONS },
                        { label: "분할 방식", name: "splitType", options: SPLIT_OPTIONS },
                        { label: "운동 경력", name: "experienceLevel", options: EXP_OPTIONS },
                    ].map((field) => (
                        <div key={field.name} className="space-y-0.5">
                            <label className="text-xs font-semibold text-slate-500">{field.label}</label>
                            <div className="relative">
                                <select
                                    name={field.name}
                                    value={String(formData[field.name as keyof typeof formData])}
                                    onChange={handleChange}
                                    className={SELECT_CLS}
                                >
                                    {field.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    ))}

                    {/* 주당 운동 횟수 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-slate-500">주당 운동 횟수</label>
                        <input
                            type="number"
                            name="trainingDaysPerWeek"
                            min={1}
                            max={7}
                            value={String(formData.trainingDaysPerWeek)}
                            onChange={handleChange}
                            className={INPUT_CLS}
                        />
                    </div>
                </div>

                {/* 운동 가능 요일 */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">운동 가능 요일</p>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                            <button
                                key={day.value}
                                type="button"
                                onClick={() => handleDayToggle(day.value)}
                                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all border ${
                                    formData.availableDays.includes(day.value)
                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 사용 가능한 장비 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Dumbbell className="w-4 h-4 text-slate-500" />
                        <p className="text-xs font-semibold text-slate-500">사용 가능한 장비</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENTS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => handleEquipmentToggle(item.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                    formData.equipmentAccess.includes(item.value)
                                        ? "border-slate-600 bg-slate-800 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section 3: 스트렝스 베이스라인 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-slate-600" />
                    <h2 className="text-base font-bold text-slate-800">4대 운동 기준 중량 (1RM 참고)</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {formData.strengthBaseline.map((item, index) => {
                        const weightField = `strengthBaseline.${index}.workingWeightKg`
                        const repsField = `strengthBaseline.${index}.reps`
                        const weightRegister = register(weightField, numericRules("workingWeightKg", weightUnit))
                        const repsRegister = register(repsField, numericRules("reps"))

                        return (
                            <div key={item.exerciseId} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {BIG_FOUR_LABELS[item.exerciseId] || item.exerciseNameSnapshot}
                                    </p>
                                    <p className="text-xs text-slate-400">{item.exerciseNameSnapshot}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500">중량 {weightUnit}</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={toDisplayBound(NUMERIC_RANGES.workingWeightKg.max, weightUnit)}
                                            step="any"
                                            value={
                                                weightUnit === "lbs"
                                                    ? Math.round(item.workingWeightKg * 2.20462)
                                                    : item.workingWeightKg
                                            }
                                            onChange={(e) => {
                                                weightRegister.onChange(e)
                                                const raw = e.target.value
                                                const inKg = weightUnit === "lbs" ? String(Number(raw) / 2.20462) : raw
                                                handleStrengthBaselineChange(item.exerciseId, "workingWeightKg", inKg)
                                                void trigger(weightField)
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none"
                                        />
                                        {errors.strengthBaseline &&
                                            Array.isArray(errors.strengthBaseline) &&
                                            errors.strengthBaseline[index]?.workingWeightKg?.message && (
                                                <p className="text-xs text-red-600">
                                                    {String(errors.strengthBaseline[index]?.workingWeightKg?.message)}
                                                </p>
                                            )}
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-xs font-semibold text-slate-500">반복</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={NUMERIC_RANGES.reps.max}
                                            step={1}
                                            value={item.reps}
                                            onChange={(e) => {
                                                repsRegister.onChange(e)
                                                handleStrengthBaselineChange(item.exerciseId, "reps", e.target.value)
                                                void trigger(repsField)
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none"
                                        />
                                        {errors.strengthBaseline &&
                                            Array.isArray(errors.strengthBaseline) &&
                                            errors.strengthBaseline[index]?.reps?.message && (
                                                <p className="text-xs text-red-600">
                                                    {String(errors.strengthBaseline[index]?.reps?.message)}
                                                </p>
                                            )}
                                    </label>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Section 4: 부상 및 관리 부위 */}
            <div className="bg-red-50/30 border border-red-100 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Bandage className="w-5 h-5 text-red-400" />
                    <h2 className="text-base font-bold text-slate-800">부상 및 관리 부위</h2>
                </div>

                <AnatomyModel data={domsData} onMuscleClick={handleMuscleClick} mode="injury" />

                {formData.painAreas.length > 0 && (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {formData.painAreas.map((p) => (
                                <span
                                    key={p.area}
                                    className="border border-red-500 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 rounded-full"
                                >
                                    {PAIN_AREA_LABELS[p.area] || p.area}
                                </span>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex items-center justify-between w-full text-left"
                            >
                                <span className="text-xs font-semibold text-slate-500">부위별 상세 메모</span>
                                <ChevronDown
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isExpanded && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {formData.painAreas.map((item) => (
                                        <div key={item.area}>
                                            <input
                                                type="text"
                                                placeholder={`${PAIN_AREA_LABELS[item.area] || item.area} 부상 설명`}
                                                value={item.note}
                                                onChange={(e) => handleNoteChange(item.area, e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-300 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* 면책 고지 + 저장 버튼 */}
            <div className="sticky bottom-0 -mx-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-4 pt-3 pb-4 z-50">
                <p className="text-xs text-slate-400 text-center pb-3 leading-relaxed">
                    본 서비스에서 제공하는 루틴 및 중량 처방은 AI 기술에 기반한 가이드라인이며, 의학적 진단이나 의료적 조언을 대신할 수 없습니다. 운동 중 통증이나 이상 징후가 발생할 경우 즉시 수행을 중단하십시오.
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={nicknameStatus === "duplicate" || nicknameStatus === "checking"}
                        className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                    >
                        저장하기
                    </button>
                </div>
            </div>
        </form>
    )
}
