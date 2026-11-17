"use client"

import { Minus, Plus } from "lucide-react"
import type { ActualSet } from "@/utils/activeWorkout"
import { MAX_REPS, MAX_WEIGHT_KG, MIN_REPS, stepReps, stepWeight, toDisplayWeight, unitLabel, WEIGHT_STEP, type WeightUnit } from "@/utils/workoutSets"
import { ToggleChip } from "@/components/ui"
import type { RouteLine } from "@/utils/routeLine"

type StepperProps = {
    label: string
    value: string
    unit?: string
    decLabel: string
    incLabel: string
    onDec: () => void
    onInc: () => void
    decDisabled?: boolean
    incDisabled?: boolean
}

const STEP_BUTTON =
    "inline-flex size-14 shrink-0 items-center justify-center rounded-control border border-rail bg-ground text-ink transition-colors duration-150 hover:bg-surface active:bg-hairline disabled:opacity-40 disabled:hover:bg-ground"

function Stepper({ label, value, unit, decLabel, incLabel, onDec, onInc, decDisabled, incDisabled }: StepperProps) {
    return (
        <div role="group" aria-label={label} className="flex items-center gap-3">
            <button type="button" className={STEP_BUTTON} onClick={onDec} disabled={decDisabled} aria-label={decLabel}>
                <Minus className="size-6" aria-hidden />
            </button>
            <p className="flex min-w-0 flex-1 items-baseline justify-center gap-1 tabular-nums text-ink" aria-live="off">
                <span className="text-display font-bold">{value}</span>
                {unit && <span className="text-title-sm text-ink-2">{unit}</span>}
            </p>
            <button type="button" className={STEP_BUTTON} onClick={onInc} disabled={incDisabled} aria-label={incLabel}>
                <Plus className="size-6" aria-hidden />
            </button>
        </div>
    )
}

type SetLoggerProps = {
    actual: ActualSet
    unit: WeightUnit
    line: RouteLine
    onChange: (next: ActualSet) => void
}

/** Weight and reps for the set about to be marked done. Defaults to the prescription; values are kept in kg. */
export function SetLogger({ actual, unit, line, onChange }: SetLoggerProps) {
    const step = WEIGHT_STEP[unit]
    const u = unitLabel(unit)
    const isBodyweight = actual.weightKg === null || actual.weightKg <= 0
    const weightValue = isBodyweight ? "맨몸" : `${toDisplayWeight(actual.weightKg as number, unit)}`

    return (
        <div className="flex flex-col gap-3">
            <Stepper
                label="무게"
                value={weightValue}
                unit={isBodyweight ? undefined : u}
                decLabel={`무게 ${step}${u} 줄이기`}
                incLabel={`무게 ${step}${u} 늘리기`}
                onDec={() => onChange({ ...actual, weightKg: stepWeight(actual.weightKg, unit, -1) })}
                onInc={() => onChange({ ...actual, weightKg: stepWeight(actual.weightKg, unit, 1) })}
                decDisabled={isBodyweight}
                incDisabled={!isBodyweight && (actual.weightKg as number) >= MAX_WEIGHT_KG}
            />
            <Stepper
                label="횟수"
                value={`${actual.reps}`}
                unit="회"
                decLabel="횟수 1회 줄이기"
                incLabel="횟수 1회 늘리기"
                onDec={() => onChange({ ...actual, reps: stepReps(actual.reps, -1) })}
                onInc={() => onChange({ ...actual, reps: stepReps(actual.reps, 1) })}
                decDisabled={actual.reps <= MIN_REPS}
                incDisabled={actual.reps >= MAX_REPS}
            />
            <div>
                <ToggleChip
                    pressed={actual.isFailure === true}
                    line={line}
                    onClick={() => onChange({ ...actual, isFailure: !actual.isFailure })}
                >
                    더 이상 못 들 때까지 했어요
                </ToggleChip>
            </div>
        </div>
    )
}
