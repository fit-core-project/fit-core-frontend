"use client"

import { useState } from "react"
import { toast } from "sonner"
import profileApiClient from "@/lib/api/profile/profileApiClient"

const GOAL_OPTIONS = [
    { label: "근력 강화", value: "strength" },
    { label: "근비대", value: "hypertrophy" },
    { label: "체지방 감량", value: "fatLoss" },
    { label: "바디 리컴포지션", value: "recomposition" },
    { label: "건강 유지", value: "generalFitness" },
]

const EXP_OPTIONS = [
    { label: "초급", value: "beginner", desc: "운동 시작 1년 미만" },
    { label: "중급", value: "intermediate", desc: "1~3년" },
    { label: "상급", value: "advanced", desc: "3년 이상" },
]

const EQUIPMENTS = [
    { label: "바벨", value: "BARBELL" },
    { label: "덤벨", value: "DUMBBELL" },
    { label: "머신", value: "MACHINE" },
    { label: "케이블", value: "CABLE" },
    { label: "맨몸", value: "BODYWEIGHT" },
]

interface Props {
    onNext: () => void
}

export default function StepWorkout({ onNext }: Props) {
    const [goalType, setGoalType] = useState("")
    const [experienceLevel, setExperienceLevel] = useState("")
    const [equipmentAccess, setEquipmentAccess] = useState<string[]>([])
    const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(3)
    const [saving, setSaving] = useState(false)

    const toggleEquipment = (value: string) => {
        setEquipmentAccess((prev) =>
            prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
        )
    }

    const canProceed = goalType !== "" && experienceLevel !== "" && equipmentAccess.length > 0 && !saving

    const handleSave = async () => {
        if (!canProceed) return
        setSaving(true)
        try {
            await profileApiClient.updateMe({
                goalType: goalType as "strength" | "hypertrophy" | "fatLoss" | "recomposition" | "generalFitness",
                experienceLevel: experienceLevel as "beginner" | "intermediate" | "advanced",
                equipmentAccess,
                trainingDaysPerWeek,
            })
            onNext()
        } catch {
            toast.error("운동 설정 저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">운동 설정을 알려주세요</h2>
                <p className="mt-1 text-sm text-slate-500">AI가 맞춤 루틴을 만드는 데 활용돼요.</p>
            </div>

            <div className="flex flex-col gap-5">
                <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">운동 목표 *</p>
                    <div className="flex flex-col gap-2">
                        {GOAL_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setGoalType(opt.value)}
                                className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                                    goalType === opt.value
                                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">운동 경력 *</p>
                    <div className="flex flex-col gap-2">
                        {EXP_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setExperienceLevel(opt.value)}
                                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                                    experienceLevel === opt.value
                                        ? "border-emerald-600 bg-emerald-50"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                            >
                                <span className={`text-sm font-bold ${experienceLevel === opt.value ? "text-emerald-700" : "text-slate-700"}`}>
                                    {opt.label}
                                </span>
                                <span className="ml-2 text-xs text-slate-400">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">사용 가능한 장비 * (1개 이상)</p>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENTS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => toggleEquipment(item.value)}
                                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                                    equipmentAccess.includes(item.value)
                                        ? "border-slate-700 bg-slate-800 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-500">주당 운동 횟수</label>
                    <div className="mt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setTrainingDaysPerWeek((d) => Math.max(1, d - 1))}
                            className="h-10 w-10 rounded-full border border-slate-200 text-xl font-bold text-slate-600 hover:bg-slate-50"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-xl font-extrabold text-slate-900">{trainingDaysPerWeek}</span>
                        <button
                            type="button"
                            onClick={() => setTrainingDaysPerWeek((d) => Math.min(7, d + 1))}
                            className="h-10 w-10 rounded-full border border-slate-200 text-xl font-bold text-slate-600 hover:bg-slate-50"
                        >
                            +
                        </button>
                        <span className="text-sm text-slate-400">일/주</span>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={handleSave}
                disabled={!canProceed}
                className="mt-2 w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
            >
                {saving ? "저장 중..." : "다음"}
            </button>
        </div>
    )
}
