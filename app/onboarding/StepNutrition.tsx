"use client"

import { useState } from "react"
import { toast } from "sonner"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"

interface Props {
    onNext: () => void
}

export default function StepNutrition({ onNext }: Props) {
    const [kcalGoal, setKcalGoal] = useState("")
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        const value = kcalGoal !== "" ? Math.round(parseFloat(kcalGoal)) : null
        if (value !== null && (isNaN(value) || value <= 0)) {
            toast.error("올바른 칼로리 목표를 입력해주세요.")
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
            toast.error("영양 목표 저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">칼로리 목표를 설정해보세요</h2>
                <p className="mt-1 text-sm text-slate-500">선택 사항이에요. 나중에 마이페이지에서 자세히 설정할 수 있어요.</p>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500">일일 칼로리 목표 (kcal)</label>
                <input
                    type="number"
                    min={0}
                    step={50}
                    value={kcalGoal}
                    onChange={(e) => setKcalGoal(e.target.value)}
                    placeholder="예: 2000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-slate-400">비워두면 칼로리 목표 없이 시작해요.</p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                >
                    {saving ? "저장 중..." : "저장하고 시작하기"}
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={saving}
                    className="w-full rounded-2xl border border-slate-200 py-3.5 text-base font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                    나중에 설정하기
                </button>
            </div>
        </div>
    )
}
