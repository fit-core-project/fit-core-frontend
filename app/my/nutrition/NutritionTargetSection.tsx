"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { NutritionTarget } from "@/types/project"
import { Button, Section, Skeleton, Surface, TextField } from "@/components/ui"

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

function numberField(
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    suffix: string,
    step = "any",
    inputMode: "decimal" | "numeric" = "decimal",
) {
    return (
        <TextField
            label={label}
            type="number"
            inputMode={inputMode}
            step={step}
            min={0}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            suffix={suffix}
        />
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
            .catch(() => toast.error("영양 목표를 불러오지 못했어요. 잠시 후 다시 열어 주세요."))
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
            toast.error("단백질 최솟값이 최댓값보다 커요. 값을 고쳐 주세요.")
            return
        }
        if (carbsMin != null && carbsMax != null && carbsMin > carbsMax) {
            toast.error("탄수화물 최솟값이 최댓값보다 커요. 값을 고쳐 주세요.")
            return
        }
        if (fatMin != null && fatMax != null && fatMin > fatMax) {
            toast.error("지방 최솟값이 최댓값보다 커요. 값을 고쳐 주세요.")
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
            toast.success("영양 목표를 저장했어요.")
        } catch {
            toast.error("영양 목표를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Section title="영양 목표" className="mb-5" aria-busy="true">
                <Surface className="flex flex-col gap-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </Surface>
            </Section>
        )
    }

    const range = (title: string, minField: keyof NutritionTargetForm, maxField: keyof NutritionTargetForm) => (
        <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-body-sm font-medium text-ink">{title}</legend>
            <div className="grid grid-cols-2 gap-2">
                {numberField("최소", form[minField], (value) => updateField(minField, value), "최솟값", "g")}
                {numberField("최대", form[maxField], (value) => updateField(maxField, value), "최댓값", "g")}
            </div>
        </fieldset>
    )

    return (
        <Section title="영양 목표" className="mb-5">
            <Surface className="flex flex-col gap-4">
                <p className="text-body-sm text-ink-2">하루 칼로리와 탄수화물·단백질·지방 기준을 정해요. 비워 둔 항목은 비교하지 않아요.</p>

                {numberField("하루 칼로리 목표", form.kcalGoal, (value) => updateField("kcalGoal", value), "예: 2000", "kcal")}
                {range("탄수화물", "carbsGMin", "carbsGMax")}
                {range("단백질", "proteinGMin", "proteinGMax")}
                {range("지방", "fatGMin", "fatGMax")}

                <div className="flex flex-col gap-4 border-t border-hairline pt-4">
                    {numberField("당류 최대", form.sugarMax, (value) => updateField("sugarMax", value), "예: 50", "g")}
                    {numberField("식이섬유 최소", form.fiberMin, (value) => updateField("fiberMin", value), "예: 25", "g")}
                    {numberField("나트륨 최대", form.sodiumMax, (value) => updateField("sodiumMax", value), "예: 2000", "mg", "1", "numeric")}
                </div>

                <Button variant="primary" size="lg" block loading={saving} icon={<Save className="size-4" aria-hidden />} onClick={handleSave}>
                    목표 저장
                </Button>
            </Surface>
        </Section>
    )
}
