"use client"

import { useState } from "react"
import { toast } from "sonner"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import { Button, TextField } from "@/components/ui"

interface Props {
    onNext: () => void
}

export default function StepNutrition({ onNext }: Props) {
    const [kcalGoal, setKcalGoal] = useState("")
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        const value = kcalGoal !== "" ? Math.round(parseFloat(kcalGoal)) : null
        if (value !== null && (isNaN(value) || value <= 0)) {
            toast.error("칼로리 목표는 0보다 큰 숫자로 입력하세요.")
            return
        }
        setSaving(true)
        try {
            await nutritionTargetApiClient.saveTarget({
                kcalGoal: value,
                proteinGMin: null,
                proteinGMax: null,
                carbsGMin: null,
                carbsGMax: null,
                fatGMin: null,
                fatGMax: null,
                sugarMax: null,
                fiberMin: null,
                sodiumMax: null,
            })
            onNext()
        } catch {
            toast.error("영양 목표를 저장하지 못했어요. 잠시 후 다시 시도하세요.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-title font-bold text-ink">하루 칼로리 목표를 정해 보세요</h1>
                <p className="mt-1 text-body-sm text-ink-2">건너뛰어도 돼요. 탄단지 목표는 마이 페이지에서 자세히 정할 수 있어요.</p>
            </div>

            <TextField
                label="하루 칼로리 목표"
                optional
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                suffix="kcal"
                value={kcalGoal}
                onChange={(e) => setKcalGoal(e.target.value)}
                placeholder="예: 2000"
                hint="비워 두면 칼로리 목표 없이 시작해요."
            />

            <div className="flex flex-col gap-2">
                <Button variant="primary" size="lg" block loading={saving} onClick={handleSave}>
                    {saving ? "저장하고 있어요" : "저장하고 시작하기"}
                </Button>
                <Button variant="ghost" size="lg" block disabled={saving} onClick={onNext}>
                    나중에 정하기
                </Button>
            </div>
        </div>
    )
}
