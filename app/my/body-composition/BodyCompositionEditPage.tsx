import React, { useState } from "react"
import { BodyComposition } from "@/types/project"
import { useSettingsStore } from "@/store/settingsStore"
import { useForm } from "react-hook-form"
import { NUMERIC_RANGES, numericRules, toDisplayBound } from "@/utils/numericValidation"
import { Button, Notice, Section, TextField } from "@/components/ui"
import {
    BODY_COMPOSITION_RANGES,
    type BodyCompositionErrors,
    type ExtraRangeField,
    displayBound,
    hasBodyCompositionErrors,
    toKstDateString,
    validateBodyComposition,
    validateExtraRange,
} from "./bodyCompositionValidation"
import { toDisplayValues, toStoredValues } from "./bodyCompositionUnits"

function getKstTodayDateString(): string {
    return toKstDateString()
}

type props = {
    onCancel: () => void
    onSave: (formData: BodyComposition) => void
    /** Record being edited (values in kg). Omitted for a new record. */
    initialValue?: BodyComposition
}


export const BodyCompositionEditPage = ({ onCancel, onSave, initialValue }: props) => {
    const { weightUnit } = useSettingsStore()
    const [initialDisplay] = useState<Partial<BodyComposition>>(() =>
        initialValue ? toDisplayValues(initialValue, weightUnit) : { measuredAt: getKstTodayDateString() }
    )
    const [formData, setFormData] = useState<Partial<BodyComposition>>(initialDisplay)
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({
        mode: "onChange",
        defaultValues: {
            bodyWeightKg: initialDisplay.bodyWeightKg,
            skeletalMuscleMassKg: initialDisplay.skeletalMuscleMassKg,
            bodyFatPct: initialDisplay.bodyFatPct,
        },
    })

    const [formErrors, setFormErrors] = useState<BodyCompositionErrors>({})
    const [submitted, setSubmitted] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        const parsed = type === "number" ? (value === "" ? undefined : parseFloat(value)) : value
        setFormData((prev) => ({
            ...(prev ?? {}),
            [name]: parsed,
        }))
        // Live feedback for the extra range fields; form-level messages refresh after the first submit.
        setFormErrors((prev) => {
            const next = { ...prev }
            if (name in BODY_COMPOSITION_RANGES) {
                const message = validateExtraRange(name as ExtraRangeField, parsed, weightUnit)
                if (message) next[name as ExtraRangeField] = message
                else delete next[name as ExtraRangeField]
            }
            if (submitted) {
                const all = validateBodyComposition({ ...formData, [name]: parsed }, weightUnit)
                if (all.measuredAt) next.measuredAt = all.measuredAt
                else delete next.measuredAt
                if (all.measurements) next.measurements = all.measurements
                else delete next.measurements
            }
            return next
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        const isValid = await trigger()
        const errorsNow = validateBodyComposition(formData, weightUnit)
        setFormErrors(errorsNow)
        if (!isValid || hasBodyCompositionErrors(errorsNow)) return

        onSave(toStoredValues(formData, weightUnit, initialValue ? { stored: initialValue, display: initialDisplay } : undefined))
    }

    const bodyWeightRegister = register("bodyWeightKg", numericRules("bodyWeightKg", weightUnit))
    const skeletalMuscleRegister = register("skeletalMuscleMassKg", numericRules("skeletalMuscleMassKg", weightUnit))
    const bodyFatPctRegister = register("bodyFatPct", numericRules("bodyFatPct"))

    return (
        <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
            <Section title={initialValue ? "체성분 기록 수정" : "체성분 기록"}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <div className="col-span-2">
                        <TextField
                            label="측정일"
                            type="date"
                            name="measuredAt"
                            required
                            max={getKstTodayDateString()}
                            value={formData?.measuredAt || ""}
                            onChange={handleChange}
                            error={formErrors.measuredAt}
                        />
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
                        min={displayBound(BODY_COMPOSITION_RANGES.bodyFatMassKg.min, weightUnit)}
                        max={displayBound(BODY_COMPOSITION_RANGES.bodyFatMassKg.max, weightUnit)}
                        name="bodyFatMassKg"
                        value={formData?.bodyFatMassKg || ""}
                        onChange={handleChange}
                        error={formErrors.bodyFatMassKg}
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
                        min={displayBound(BODY_COMPOSITION_RANGES.fatFreeMassKg.min, weightUnit)}
                        max={displayBound(BODY_COMPOSITION_RANGES.fatFreeMassKg.max, weightUnit)}
                        name="fatFreeMassKg"
                        value={formData?.fatFreeMassKg || ""}
                        onChange={handleChange}
                        error={formErrors.fatFreeMassKg}
                    />

                    <TextField
                        label="내장지방 레벨"
                        type="number"
                        inputMode="numeric"
                        min={BODY_COMPOSITION_RANGES.visceralFatLevel.min}
                        max={BODY_COMPOSITION_RANGES.visceralFatLevel.max}
                        step={BODY_COMPOSITION_RANGES.visceralFatLevel.step}
                        name="visceralFatLevel"
                        value={formData?.visceralFatLevel || ""}
                        onChange={handleChange}
                        error={formErrors.visceralFatLevel}
                    />

                    <div className="col-span-2">
                        <TextField
                            label="허리엉덩이비율(WHR)"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min={BODY_COMPOSITION_RANGES.waistHipRatio.min}
                            max={BODY_COMPOSITION_RANGES.waistHipRatio.max}
                            name="waistHipRatio"
                            value={formData?.waistHipRatio || ""}
                            onChange={handleChange}
                            error={formErrors.waistHipRatio}
                        />
                    </div>
                </div>
            </Section>

            {formErrors.measurements && <Notice tone="danger">{formErrors.measurements}</Notice>}

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
