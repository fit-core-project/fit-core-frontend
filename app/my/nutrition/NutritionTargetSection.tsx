"use client"

import { useEffect, useState } from "react"
import { Save, Utensils } from "lucide-react"
import { toast } from "sonner"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { NutritionTarget } from "@/types/project"

const INPUT_CLS =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"

interface NutritionTargetForm {
    kcalGoal: string
    proteinGMin: string
    proteinGMax: string
    carbsGMin: string
    carbsGMax: string
    fatGMin: string
    fatGMax: string
    sugarMax: string
    fiberMin: string
    sodiumMax: string
}

interface NutritionTargetSectionProps {
    onSaved?: (target: NutritionTarget) => void
}

const EMPTY_FORM: NutritionTargetForm = {
    kcalGoal: "",
    proteinGMin: "",
    proteinGMax: "",
    carbsGMin: "",
    carbsGMax: "",
    fatGMin: "",
    fatGMax: "",
    sugarMax: "",
    fiberMin: "",
    sodiumMax: "",
}

function toForm(target: NutritionTarget | null): NutritionTargetForm {
    if (!target) return EMPTY_FORM
    return {
        kcalGoal: target.kcalGoal != null ? String(target.kcalGoal) : "",
        proteinGMin: target.proteinGMin != null ? String(target.proteinGMin) : "",
        proteinGMax: target.proteinGMax != null ? String(target.proteinGMax) : "",
        carbsGMin: target.carbsGMin != null ? String(target.carbsGMin) : "",
        carbsGMax: target.carbsGMax != null ? String(target.carbsGMax) : "",
        fatGMin: target.fatGMin != null ? String(target.fatGMin) : "",
        fatGMax: target.fatGMax != null ? String(target.fatGMax) : "",
        sugarMax: target.sugarMax != null ? String(target.sugarMax) : "",
        fiberMin: target.fiberMin != null ? String(target.fiberMin) : "",
        sodiumMax: target.sodiumMax != null ? String(target.sodiumMax) : "",
    }
}

function toNum(value: string): number | null {
    return value !== "" ? parseFloat(value) : null
}

function numberInputProps(label: string, value: string, onChange: (value: string) => void, placeholder: string, step = "any") {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <input
                type="number"
                step={step}
                min={0}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={INPUT_CLS}
            />
        </label>
    )
}

export default function NutritionTargetSection({ onSaved }: NutritionTargetSectionProps) {
    const [form, setForm] = useState<NutritionTargetForm>(EMPTY_FORM)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        nutritionTargetApiClient
            .getTarget()
            .then((target) => setForm(toForm(target)))
            .catch(() => toast.error("영양 목표를 불러오지 못했습니다."))
            .finally(() => setLoading(false))
    }, [])

    const updateField = (field: keyof NutritionTargetForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        const proteinMin = toNum(form.proteinGMin)
        const proteinMax = toNum(form.proteinGMax)
        const carbsMin = toNum(form.carbsGMin)
        const carbsMax = toNum(form.carbsGMax)
        const fatMin = toNum(form.fatGMin)
        const fatMax = toNum(form.fatGMax)

        if (proteinMin != null && proteinMax != null && proteinMin > proteinMax) {
            toast.error("단백질 최솟값이 최댓값보다 클 수 없습니다.")
            return
        }
        if (carbsMin != null && carbsMax != null && carbsMin > carbsMax) {
            toast.error("탄수화물 최솟값이 최댓값보다 클 수 없습니다.")
            return
        }
        if (fatMin != null && fatMax != null && fatMin > fatMax) {
            toast.error("지방 최솟값이 최댓값보다 클 수 없습니다.")
            return
        }

        const request: NutritionTarget = {
            kcalGoal: form.kcalGoal !== "" ? Math.round(parseFloat(form.kcalGoal)) : null,
            proteinGMin: proteinMin,
            proteinGMax: proteinMax,
            carbsGMin: carbsMin,
            carbsGMax: carbsMax,
            fatGMin: fatMin,
            fatGMax: fatMax,
            sugarMax: toNum(form.sugarMax),
            fiberMin: toNum(form.fiberMin),
            sodiumMax: form.sodiumMax !== "" ? Math.round(parseFloat(form.sodiumMax)) : null,
        }

        setSaving(true)
        try {
            const saved = await nutritionTargetApiClient.saveTarget(request)
            setForm(toForm(saved))
            onSaved?.(saved)
            toast.success("영양 목표가 저장되었습니다.")
        } catch {
            toast.error("영양 목표 저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <section className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 h-5 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            </section>
        )
    }

    return (
        <section className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-amber-600" />
                        <h2 className="text-base font-extrabold text-slate-800">영양 목표</h2>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        하루 목표 칼로리와 탄수화물, 단백질, 지방 기준을 관리합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {saving ? "저장 중..." : "저장"}
                </button>
            </div>

            <div className="space-y-3">
                {numberInputProps("일일 칼로리 목표 (kcal)", form.kcalGoal, (value) => updateField("kcalGoal", value), "예: 2000")}

                <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">단백질 목표 (g)</p>
                    <div className="grid grid-cols-2 gap-2">
                        {numberInputProps("최소", form.proteinGMin, (value) => updateField("proteinGMin", value), "최솟값")}
                        {numberInputProps("최대", form.proteinGMax, (value) => updateField("proteinGMax", value), "최댓값")}
                    </div>
                </div>

                <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">탄수화물 목표 (g)</p>
                    <div className="grid grid-cols-2 gap-2">
                        {numberInputProps("최소", form.carbsGMin, (value) => updateField("carbsGMin", value), "최솟값")}
                        {numberInputProps("최대", form.carbsGMax, (value) => updateField("carbsGMax", value), "최댓값")}
                    </div>
                </div>

                <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">지방 목표 (g)</p>
                    <div className="grid grid-cols-2 gap-2">
                        {numberInputProps("최소", form.fatGMin, (value) => updateField("fatGMin", value), "최솟값")}
                        {numberInputProps("최대", form.fatGMax, (value) => updateField("fatGMax", value), "최댓값")}
                    </div>
                </div>

                {numberInputProps("당류 최대 (g)", form.sugarMax, (value) => updateField("sugarMax", value), "예: 50")}
                {numberInputProps("식이섬유 최소 (g)", form.fiberMin, (value) => updateField("fiberMin", value), "예: 25")}
                {numberInputProps("나트륨 최대 (mg)", form.sodiumMax, (value) => updateField("sodiumMax", value), "예: 2000", "1")}
            </div>
        </section>
    )
}
