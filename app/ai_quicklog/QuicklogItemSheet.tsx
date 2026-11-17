"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button, Sheet, TextField, ToggleChip } from "@/components/ui"
import { mealLabel } from "@/utils/displayLabels"
import { calcMacroKcal } from "@/utils/dietKcal"
import {
    applyDraftEdit,
    DIET_LIMITS,
    draftItemErrors,
    draftItemKcal,
    MEAL_TYPES,
    type DraftFieldErrors,
    parseOptionalNumber,
    type QuicklogDraftItem,
} from "@/utils/quicklogDraft"

interface Props {
    item: QuicklogDraftItem
    onClose: () => void
    onSave: (next: QuicklogDraftItem) => void
    onDelete: () => void
}

const toText = (value: number | null) => (value != null ? String(value) : "")

export default function QuicklogItemSheet({ item, onClose, onSave, onDelete }: Props) {
    const initialKcal = draftItemKcal(item)
    const [foodName, setFoodName] = useState(item.foodName)
    const [amount, setAmount] = useState(toText(item.amount))
    const [unit, setUnit] = useState(item.unit ?? "")
    const [protein, setProtein] = useState(toText(item.proteinG))
    const [carbs, setCarbs] = useState(toText(item.carbsG))
    const [fat, setFat] = useState(toText(item.fatG))
    const [kcal, setKcal] = useState(toText(initialKcal))
    const [kcalTouched, setKcalTouched] = useState(false)
    const [mealType, setMealType] = useState(item.mealType)
    const [error, setError] = useState("")
    // Open with the row's existing out-of-range values already flagged (AI/DB rows can exceed BE bounds).
    const [fieldErrors, setFieldErrors] = useState<DraftFieldErrors>(() => draftItemErrors(item))

    /** Macro change keeps the kcal field in sync unless the user typed kcal in this edit. */
    const onMacroChange = (setter: (v: string) => void, nextValues: { p: string; c: string; f: string }) => (value: string) => {
        setter(value)
        if (kcalTouched) return
        const p = parseOptionalNumber(nextValues.p)
        const c = parseOptionalNumber(nextValues.c)
        const f = parseOptionalNumber(nextValues.f)
        if (p === undefined || c === undefined || f === undefined) return
        setKcal(p == null && c == null && f == null ? "" : String(calcMacroKcal(p, c, f)))
    }

    const clearFieldError = (field: keyof DraftFieldErrors) =>
        setFieldErrors((prev) => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })

    const handleSave = () => {
        const name = foodName.trim()
        if (!name) {
            setError("음식 이름을 적어 주세요.")
            return
        }
        const parsed = {
            amount: parseOptionalNumber(amount),
            proteinG: parseOptionalNumber(protein),
            carbsG: parseOptionalNumber(carbs),
            fatG: parseOptionalNumber(fat),
            kcal: parseOptionalNumber(kcal),
        }
        if (Object.values(parsed).some((v) => v === undefined)) {
            setFieldErrors({})
            setError("숫자 칸에는 0 이상의 숫자만 적어 주세요.")
            return
        }
        const { amount: a, proteinG, carbsG, fatG, kcal: k } = parsed as Record<keyof typeof parsed, number | null>
        if (proteinG == null && carbsG == null && fatG == null && k == null) {
            setError("탄수화물·단백질·지방이나 칼로리 중 하나는 적어 주세요.")
            return
        }
        const next = applyDraftEdit(
            item,
            { foodName: name, amount: a, unit: unit.trim() || null, proteinG, carbsG, fatG, mealType },
            kcalTouched ? (k != null ? Math.round(k) : null) : undefined,
        )
        const errors = draftItemErrors(next)
        setFieldErrors(errors)
        if (Object.keys(errors).length > 0) {
            setError("빨간 칸의 값을 줄여 주세요.")
            return
        }
        setError("")
        onSave(next)
    }

    const p = protein
    const c = carbs
    const f = fat

    return (
        <Sheet
            open
            onClose={onClose}
            title="음식 수정"
            description="저장하기 전에 이름과 양, 영양 정보를 고칠 수 있어요."
            footer={
                <div className="grid grid-cols-[auto_1fr] gap-2">
                    <Button variant="secondary" className="text-danger-ink" icon={<Trash2 className="size-4" aria-hidden />} onClick={onDelete}>
                        빼기
                    </Button>
                    <Button variant="primary" size="lg" block onClick={handleSave}>
                        수정 완료
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-5">
                <TextField label="음식 이름" value={foodName} onChange={(e) => setFoodName(e.target.value)} autoComplete="off" />

                <div className="grid grid-cols-2 gap-3">
                    <TextField
                        label="양"
                        optional
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.1}
                        error={fieldErrors.amount}
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value)
                            clearFieldError("amount")
                        }}
                    />
                    <TextField label="단위" optional value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="예: g, 개, 공기" />
                </div>

                <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1.5 text-body-sm font-medium text-ink">끼니</legend>
                    <div className="grid grid-cols-4 gap-2">
                        {MEAL_TYPES.map((code) => (
                            <ToggleChip key={code} pressed={mealType === code} onClick={() => setMealType(code)}>
                                {mealLabel(code)}
                            </ToggleChip>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-1.5 text-body-sm font-medium text-ink">탄단지</legend>
                    <div className="grid grid-cols-3 gap-2">
                        <TextField
                            label="탄수화물"
                            type="number"
                            inputMode="decimal"
                            suffix="g"
                            min={0}
                            step={0.1}
                            max={DIET_LIMITS.macroG}
                            error={fieldErrors.carbsG}
                            value={carbs}
                            onChange={(e) => {
                                clearFieldError("carbsG")
                                onMacroChange(setCarbs, { p, c: e.target.value, f })(e.target.value)
                            }}
                        />
                        <TextField
                            label="단백질"
                            type="number"
                            inputMode="decimal"
                            suffix="g"
                            min={0}
                            step={0.1}
                            max={DIET_LIMITS.macroG}
                            error={fieldErrors.proteinG}
                            value={protein}
                            onChange={(e) => {
                                clearFieldError("proteinG")
                                onMacroChange(setProtein, { p: e.target.value, c, f })(e.target.value)
                            }}
                        />
                        <TextField
                            label="지방"
                            type="number"
                            inputMode="decimal"
                            suffix="g"
                            min={0}
                            step={0.1}
                            max={DIET_LIMITS.macroG}
                            error={fieldErrors.fatG}
                            value={fat}
                            onChange={(e) => {
                                clearFieldError("fatG")
                                onMacroChange(setFat, { p, c, f: e.target.value })(e.target.value)
                            }}
                        />
                    </div>
                </fieldset>

                <TextField
                    label="칼로리"
                    type="number"
                    inputMode="numeric"
                    suffix="kcal"
                    min={0}
                    max={DIET_LIMITS.kcal}
                    error={fieldErrors.kcal}
                    value={kcal}
                    onChange={(e) => {
                        setKcal(e.target.value)
                        setKcalTouched(true)
                        clearFieldError("kcal")
                    }}
                    hint={kcalTouched ? "직접 적은 칼로리로 저장해요." : "탄단지를 바꾸면 칼로리를 다시 계산해요."}
                />

                {error && (
                    <p role="alert" className="text-body-sm text-danger-ink">
                        {error}
                    </p>
                )}
            </div>
        </Sheet>
    )
}
