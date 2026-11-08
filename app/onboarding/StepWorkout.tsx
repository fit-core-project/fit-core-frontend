"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { Button, ToggleChip } from "@/components/ui"
import { equipmentLabel, experienceLabel, goalLabel } from "@/utils/displayLabels"

const GOAL_OPTIONS = ["strength", "hypertrophy", "fatLoss", "recomposition", "generalFitness"] as const

const EXP_OPTIONS = [
    { value: "beginner", desc: "운동 시작 1년 미만" },
    { value: "intermediate", desc: "1~3년" },
    { value: "advanced", desc: "3년 이상" },
] as const

const EQUIPMENTS = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"] as const

const STEPPER_CLS =
    "inline-flex size-11 items-center justify-center rounded-control border border-rail bg-ground text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"

interface Props {
    onNext: () => void
}

function FieldLabel({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <p id={id} className="mb-2 text-body-sm font-medium text-ink">
            {children}
        </p>
    )
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
            toast.error("운동 설정을 저장하지 못했어요. 잠시 후 다시 시도하세요.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-title font-bold text-ink">운동 설정을 알려주세요</h1>
                <p className="mt-1 text-body-sm text-ink-2">AI가 맞춤 루틴을 만들 때 써요.</p>
            </div>

            <div className="flex flex-col gap-6">
                <div>
                    <FieldLabel id="onboarding-goal">운동 목표</FieldLabel>
                    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="onboarding-goal">
                        {GOAL_OPTIONS.map((value) => (
                            <ToggleChip key={value} pressed={goalType === value} onClick={() => setGoalType(value)}>
                                {goalLabel(value)}
                            </ToggleChip>
                        ))}
                    </div>
                </div>

                <div>
                    <FieldLabel id="onboarding-exp">운동 경력</FieldLabel>
                    <div className="flex flex-col gap-2" role="group" aria-labelledby="onboarding-exp">
                        {EXP_OPTIONS.map((opt) => (
                            <ToggleChip
                                key={opt.value}
                                pressed={experienceLevel === opt.value}
                                onClick={() => setExperienceLevel(opt.value)}
                            >
                                <span className="flex w-full items-baseline gap-2 py-2 text-left">
                                    <span className="font-bold">{experienceLabel(opt.value)}</span>
                                    <span className={experienceLevel === opt.value ? "text-white" : "text-ink-2"}>{opt.desc}</span>
                                </span>
                            </ToggleChip>
                        ))}
                    </div>
                </div>

                <div>
                    <FieldLabel id="onboarding-equipment">
                        쓸 수 있는 장비<span className="ml-1 font-normal text-ink-2">(1개 이상)</span>
                    </FieldLabel>
                    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="onboarding-equipment">
                        {EQUIPMENTS.map((value) => (
                            <ToggleChip key={value} pressed={equipmentAccess.includes(value)} onClick={() => toggleEquipment(value)}>
                                {equipmentLabel(value)}
                            </ToggleChip>
                        ))}
                    </div>
                </div>

                <div>
                    <FieldLabel id="onboarding-days">주당 운동 횟수</FieldLabel>
                    <div className="flex items-center gap-3" role="group" aria-labelledby="onboarding-days">
                        <button
                            type="button"
                            className={STEPPER_CLS}
                            aria-label="하루 줄이기"
                            disabled={trainingDaysPerWeek <= 1}
                            onClick={() => setTrainingDaysPerWeek((d) => Math.max(1, d - 1))}
                        >
                            <Minus className="size-5" aria-hidden />
                        </button>
                        <span className="min-w-16 text-center text-title font-bold tabular-nums text-ink" aria-live="polite">
                            주 {trainingDaysPerWeek}일
                        </span>
                        <button
                            type="button"
                            className={STEPPER_CLS}
                            aria-label="하루 늘리기"
                            disabled={trainingDaysPerWeek >= 7}
                            onClick={() => setTrainingDaysPerWeek((d) => Math.min(7, d + 1))}
                        >
                            <Plus className="size-5" aria-hidden />
                        </button>
                    </div>
                </div>
            </div>

            <Button variant="primary" size="lg" block loading={saving} disabled={!canProceed} onClick={handleSave}>
                {saving ? "저장하고 있어요" : "다음"}
            </Button>
        </div>
    )
}
