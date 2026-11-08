import React, { useState } from "react"
import { BodyComposition } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"
import { useForm } from "react-hook-form"
import { NUMERIC_RANGES, numericRules, toDisplayBound } from "@/utils/numericValidation"
import { Button, Section, TextField } from "@/components/ui"

function getKstTodayDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

type props = {
    onCancel: () => void
    onSave: (formData: BodyComposition) => void
}

const WEIGHT_KG_FIELDS: (keyof BodyComposition)[] = [
    "bodyWeightKg",
    "skeletalMuscleMassKg",
    "bodyFatMassKg",
    "fatFreeMassKg",
]

export const BodyCompositionEditPage = ({ onCancel, onSave }: props) => {
    const [formData, setFormData] = useState<Partial<BodyComposition>>({ measuredAt: getKstTodayDateString() })
    const { weightUnit } = useSettingsStore()
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({ mode: "onChange" })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...(prev ?? {}),
            [name]: type === "number" ? (value === "" ? undefined : parseFloat(value)) : value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const isValid = await trigger()
        if (!isValid) return

        if (weightUnit === "lbs") {
            const converted = { ...formData } as BodyComposition
            for (const field of WEIGHT_KG_FIELDS) {
                const val = converted[field] as number | undefined
                if (val != null) {
                    ;(converted as Record<string, unknown>)[field] = val / 2.20462
                }
            }
            onSave(converted)
        } else {
            onSave(formData as BodyComposition)
        }
    }

    const bodyWeightRegister = register("bodyWeightKg", numericRules("bodyWeightKg", weightUnit))
    const skeletalMuscleRegister = register("skeletalMuscleMassKg", numericRules("skeletalMuscleMassKg", weightUnit))
    const bodyFatPctRegister = register("bodyFatPct", numericRules("bodyFatPct"))

    return (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
            <Section title="체성분 기록">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <div className="col-span-2">
                        <TextField label="측정일" type="date" name="measuredAt" value={formData?.measuredAt || ""} onChange={handleChange} />
                    </div>

                    <div className="col-span-2">
                        <TextField
                            label="측정 기기·출처"
                            optional
                            type="text"
                            name="source"
                            value={formData?.source || ""}
                            onChange={handleChange}
                            placeholder="예: 인바디, 애플워치"
                        />
                    </div>

                    <TextField
                        label="체중"
                        type="number"
                        inputMode="decimal"
                        suffix={weightUnit}
                        min={toDisplayBound(NUMERIC_RANGES.bodyWeightKg.min, weightUnit)}
                        max={toDisplayBound(NUMERIC_RANGES.bodyWeightKg.max, weightUnit)}
                        step={NUMERIC_RANGES.bodyWeightKg.step}
                        {...bodyWeightRegister}
                        value={formData?.bodyWeightKg || ""}
                        onChange={(e) => {
                            bodyWeightRegister.onChange(e)
                            handleChange(e)
                            void trigger("bodyWeightKg")
                        }}
                        error={errors.bodyWeightKg?.message ? String(errors.bodyWeightKg.message) : undefined}
                    />

                    <TextField
                        label="골격근량"
                        type="number"
                        inputMode="decimal"
                        suffix={weightUnit}
                        min={toDisplayBound(NUMERIC_RANGES.skeletalMuscleMassKg.min, weightUnit)}
                        max={toDisplayBound(NUMERIC_RANGES.skeletalMuscleMassKg.max, weightUnit)}
                        step={NUMERIC_RANGES.skeletalMuscleMassKg.step}
                        {...skeletalMuscleRegister}
                        value={formData?.skeletalMuscleMassKg || ""}
                        onChange={(e) => {
                            skeletalMuscleRegister.onChange(e)
                            handleChange(e)
                            void trigger("skeletalMuscleMassKg")
                        }}
                        error={errors.skeletalMuscleMassKg?.message ? String(errors.skeletalMuscleMassKg.message) : undefined}
                    />

                    <TextField
                        label="체지방량"
                        type="number"
                        inputMode="decimal"
                        suffix={weightUnit}
                        step="0.1"
                        name="bodyFatMassKg"
                        value={formData?.bodyFatMassKg || ""}
                        onChange={handleChange}
                    />

                    <TextField
                        label="체지방률"
                        type="number"
                        inputMode="decimal"
                        suffix="%"
                        min={NUMERIC_RANGES.bodyFatPct.min}
                        max={NUMERIC_RANGES.bodyFatPct.max}
                        step={NUMERIC_RANGES.bodyFatPct.step}
                        {...bodyFatPctRegister}
                        value={formData?.bodyFatPct || ""}
                        onChange={(e) => {
                            bodyFatPctRegister.onChange(e)
                            handleChange(e)
                            void trigger("bodyFatPct")
                        }}
                        error={errors.bodyFatPct?.message ? String(errors.bodyFatPct.message) : undefined}
                    />

                    <TextField
                        label="제지방량"
                        type="number"
                        inputMode="decimal"
                        suffix={weightUnit}
                        step="0.1"
                        name="fatFreeMassKg"
                        value={formData?.fatFreeMassKg || ""}
                        onChange={handleChange}
                    />

                    <TextField
                        label="내장지방 레벨"
                        type="number"
                        inputMode="numeric"
                        name="visceralFatLevel"
                        value={formData?.visceralFatLevel || ""}
                        onChange={handleChange}
                    />

                    <div className="col-span-2">
                        <TextField
                            label="허리엉덩이비율(WHR)"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            name="waistHipRatio"
                            value={formData?.waistHipRatio || ""}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </Section>

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-hairline bg-ground px-4 pb-4 pt-3">
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" size="lg" onClick={onCancel}>
                        취소
                    </Button>
                    <Button type="submit" variant="primary" size="lg" className="col-span-2">
                        저장하기
                    </Button>
                </div>
            </div>
        </form>
    )
}
