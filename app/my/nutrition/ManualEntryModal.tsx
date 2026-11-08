"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import type { DietLogRequest, DietLogResponse } from "@/types/project"
import { mealLabel } from "@/utils/displayLabels"
import { Button, Sheet, TextField, ToggleChip } from "@/components/ui"

interface Props {
    onClose: () => void
    onSaved: () => void
    editItem?: DietLogResponse
    defaultDate?: string
}

const MEAL_OPTIONS = ["breakfast", "lunch", "dinner", "snack"] as const

function getKstDate(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function getKstTime(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16)
}

function computePreviewKcal(protein: string, carbs: string, fat: string): number | null {
    const p = parseFloat(protein)
    const c = parseFloat(carbs)
    const f = parseFloat(fat)
    if (isNaN(p) && isNaN(c) && isNaN(f)) return null
    return Math.round((isNaN(p) ? 0 : p) * 4 + (isNaN(c) ? 0 : c) * 4 + (isNaN(f) ? 0 : f) * 9)
}

export default function ManualEntryModal({ onClose, onSaved, editItem, defaultDate }: Props) {
    const isEdit = !!editItem
    const [foodName, setFoodName] = useState(editItem?.foodName ?? "")
    const [mealType, setMealType] = useState(editItem?.mealType ?? "")
    const [loggedAt, setLoggedAt] = useState(() =>
        editItem?.loggedAt ? editItem.loggedAt.slice(11, 16) : getKstTime()
    )
    const [amountRaw, setAmountRaw] = useState(editItem?.amountRaw ?? "")
    const [amountG, setAmountG] = useState(editItem?.amountG != null ? String(editItem.amountG) : "")
    const [protein, setProtein] = useState(editItem?.proteinG != null ? String(editItem.proteinG) : "")
    const [carbs, setCarbs] = useState(editItem?.carbsG != null ? String(editItem.carbsG) : "")
    const [fat, setFat] = useState(editItem?.fatG != null ? String(editItem.fatG) : "")
    const [kcal, setKcal] = useState(editItem?.kcal != null ? String(editItem.kcal) : "")
    const [isSaving, setIsSaving] = useState(false)
    const [validationMsg, setValidationMsg] = useState("")
    const [confirmOpen, setConfirmOpen] = useState(false)
    const foodNameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        foodNameRef.current?.focus()
    }, [])

    const previewKcal = computePreviewKcal(protein, carbs, fat)
    const hasMacro = protein !== "" || carbs !== "" || fat !== ""
    const hasKcal = kcal !== ""
    const canSave = foodName.trim() !== "" && (hasMacro || hasKcal)

    const buildReq = (): DietLogRequest => ({
        logDate: editItem?.logDate ?? defaultDate ?? getKstDate(),
        mealType: mealType || null,
        loggedAt: loggedAt || null,
        foodName: foodName.trim(),
        amountRaw: amountRaw.trim() || null,
        amountG: amountG !== "" ? parseFloat(amountG) : null,
        proteinG: protein !== "" ? parseFloat(protein) : null,
        carbsG: carbs !== "" ? parseFloat(carbs) : null,
        fatG: fat !== "" ? parseFloat(fat) : null,
        kcal: kcal !== "" ? Math.round(parseFloat(kcal)) : null,
        source: "manual",
    })

    const handleSave = async () => {
        if (!foodName.trim()) {
            setValidationMsg("음식 이름을 적어 주세요.")
            return
        }
        if (!hasMacro && !hasKcal) {
            setValidationMsg("탄수화물·단백질·지방이나 칼로리 중 하나는 적어 주세요.")
            return
        }
        setValidationMsg("")
        setIsSaving(true)

        try {
            if (isEdit) {
                await dietApiClient.update(editItem!.id, buildReq())
                toast.success("식단을 수정했어요.")
            } else {
                await dietApiClient.save([buildReq()])
                toast.success("식단을 저장했어요.")
            }
            onSaved()
            onClose()
        } catch {
            toast.error(isEdit ? "수정하지 못했어요. 잠시 후 다시 시도해 주세요." : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!editItem) return
        setIsSaving(true)
        try {
            await dietApiClient.delete(editItem.id)
            toast.success("기록을 삭제했어요.")
            setConfirmOpen(false)
            onSaved()
            onClose()
        } catch {
            toast.error("삭제하지 못했어요. 잠시 후 다시 시도해 주세요.")
        } finally {
            setIsSaving(false)
        }
    }

    const footer = (
        <div className={isEdit ? "grid grid-cols-[auto_1fr] gap-2" : undefined}>
            {isEdit && (
                <Button
                    variant="secondary"
                    icon={<Trash2 className="size-4" aria-hidden />}
                    onClick={() => setConfirmOpen(true)}
                    disabled={isSaving}
                    className="text-danger-ink"
                >
                    삭제
                </Button>
            )}
            <Button variant="primary" size="lg" block loading={isSaving} onClick={handleSave} disabled={!canSave}>
                {isEdit ? "수정 내용 저장" : "식단 저장"}
            </Button>
        </div>
    )

    return (
        <>
            <Sheet
                open
                onClose={onClose}
                title={isEdit ? "식단 수정" : "식단 직접 기록"}
                description={isEdit ? undefined : "음식 이름과 탄단지 또는 칼로리를 적어 주세요."}
                footer={footer}
            >
                <div className="flex flex-col gap-5">
                    {!isEdit && (
                        <Link
                            href="/ai_quicklog"
                            className="inline-flex min-h-11 items-center gap-1.5 self-start text-body-sm font-bold text-ink underline underline-offset-2"
                        >
                            <Sparkles className="size-4" aria-hidden />
                            말로 기록하기
                        </Link>
                    )}

                    <TextField
                        ref={foodNameRef}
                        label="음식 이름"
                        type="text"
                        value={foodName}
                        onChange={(e) => setFoodName(e.target.value)}
                        placeholder="예: 닭가슴살 샐러드"
                        autoComplete="off"
                    />

                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="mb-1.5 text-body-sm font-medium text-ink">
                            끼니<span className="ml-1 font-normal text-ink-2">(선택)</span>
                        </legend>
                        <div className="grid grid-cols-4 gap-2">
                            {MEAL_OPTIONS.map((code) => (
                                <ToggleChip
                                    key={code}
                                    pressed={mealType === code}
                                    onClick={() => setMealType(mealType === code ? "" : code)}
                                >
                                    {mealLabel(code)}
                                </ToggleChip>
                            ))}
                        </div>
                    </fieldset>

                    <TextField label="먹은 시간" optional type="time" value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} />

                    <div className="grid grid-cols-2 gap-3">
                        <TextField
                            label="양"
                            optional
                            type="text"
                            value={amountRaw}
                            onChange={(e) => setAmountRaw(e.target.value)}
                            placeholder="예: 1공기"
                        />
                        <TextField
                            label="무게"
                            optional
                            type="number"
                            inputMode="decimal"
                            suffix="g"
                            value={amountG}
                            onChange={(e) => setAmountG(e.target.value)}
                            placeholder="200"
                            min={0}
                            max={5000}
                            step={0.1}
                        />
                    </div>

                    <fieldset className="flex flex-col gap-3">
                        <legend className="mb-1.5 text-body-sm font-medium text-ink">
                            탄단지<span className="ml-1 font-normal text-ink-2">(선택)</span>
                        </legend>
                        <div className="grid grid-cols-3 gap-2">
                            <TextField
                                label="탄수화물"
                                type="number"
                                inputMode="decimal"
                                suffix="g"
                                value={carbs}
                                onChange={(e) => setCarbs(e.target.value)}
                                placeholder="0"
                                min={0}
                                max={1000}
                                step={0.1}
                            />
                            <TextField
                                label="단백질"
                                type="number"
                                inputMode="decimal"
                                suffix="g"
                                value={protein}
                                onChange={(e) => setProtein(e.target.value)}
                                placeholder="0"
                                min={0}
                                max={1000}
                                step={0.1}
                            />
                            <TextField
                                label="지방"
                                type="number"
                                inputMode="decimal"
                                suffix="g"
                                value={fat}
                                onChange={(e) => setFat(e.target.value)}
                                placeholder="0"
                                min={0}
                                max={1000}
                                step={0.1}
                            />
                        </div>
                        {previewKcal !== null && (
                            <p className="text-caption text-ink-2" aria-live="polite">
                                탄단지로 계산하면 <span className="font-bold tabular-nums text-ink">{previewKcal.toLocaleString()} kcal</span>예요.
                            </p>
                        )}
                    </fieldset>

                    <TextField
                        label="칼로리"
                        optional
                        type="number"
                        inputMode="decimal"
                        suffix="kcal"
                        value={kcal}
                        onChange={(e) => setKcal(e.target.value)}
                        placeholder="예: 350"
                        min={0}
                        max={5000}
                        hint="비워 두면 탄단지로 계산해요. 적으면 이 값을 먼저 써요."
                    />

                    {validationMsg && (
                        <p role="alert" className="text-body-sm text-danger-ink">
                            {validationMsg}
                        </p>
                    )}
                </div>
            </Sheet>

            {isEdit && (
                <Sheet
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    title="이 기록을 삭제할까요?"
                    description={`${editItem!.foodName} 기록을 지우면 되돌릴 수 없어요.`}
                    footer={
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="secondary" size="lg" onClick={() => setConfirmOpen(false)} disabled={isSaving}>
                                취소
                            </Button>
                            <Button variant="danger" size="lg" loading={isSaving} onClick={handleDelete}>
                                삭제
                            </Button>
                        </div>
                    }
                >
                    <p className="text-body-sm text-ink-2">오늘 영양 합계에서도 빠져요.</p>
                </Sheet>
            )}
        </>
    )
}
