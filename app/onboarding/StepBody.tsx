"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { bodyPartListFor } from "@/app/components/AnatomyModel"
import { Button, TextField, ToggleChip } from "@/components/ui"
import type { UserResponse } from "@/types/project"
import { getKstToday } from "@/utils/date"
import { muscleLabel } from "@/utils/displayLabels"
import { NUMERIC_RANGES } from "@/utils/numericValidation"
import { buildBodyStatusUpdate, initialPainSelection, parseBodyWeight, togglePainArea, type PainSelection } from "./bodyStatus"

interface Props {
    /** weightSaved is true when this save recorded today's body weight. */
    onNext: (result: { weightSaved: boolean }) => void
}

export default function StepBody({ onNext }: Props) {
    const [profile, setProfile] = useState<UserResponse | null>(null)
    const [painSelection, setPainSelection] = useState<PainSelection>(null)
    const [weight, setWeight] = useState("")
    const [weightError, setWeightError] = useState<string | undefined>(undefined)
    const [saving, setSaving] = useState(false)
    // The saved list only prefills while the user has not answered yet.
    const painTouched = useRef(false)

    useEffect(() => {
        let cancelled = false
        profileApiClient
            .getMe()
            .then((loaded) => {
                if (cancelled) return
                setProfile(loaded)
                if (!painTouched.current) setPainSelection(initialPainSelection(loaded))
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [])

    const selected = painSelection ?? []
    const parts = bodyPartListFor("injury", Object.fromEntries(selected.map((slug) => [slug, 1])), [])
    const latestWeight = profile?.bodyCompositionSnapshot?.find((item) => item.bodyWeightKg != null)?.bodyWeightKg ?? null

    const choosePain = (next: PainSelection) => {
        painTouched.current = true
        setPainSelection(next)
    }

    const handleSave = async () => {
        if (saving) return
        const parsed = parseBodyWeight(weight)
        if (!parsed.ok) {
            setWeightError(parsed.message)
            return
        }
        setWeightError(undefined)

        setSaving(true)
        try {
            // The snapshot list is replaced as a whole, so build it from the freshest stored list.
            let base = profile
            if (parsed.value !== null) {
                base = (await profileApiClient.getMe().catch(() => null)) ?? profile
            }
            const request = buildBodyStatusUpdate({ painSelection, weightKg: parsed.value, profile: base, today: getKstToday() })
            if (!request) {
                onNext({ weightSaved: false })
                return
            }
            const updated = await profileApiClient.updateMe(request)
            setProfile(updated)
            onNext({ weightSaved: parsed.value !== null })
        } catch {
            toast.error("몸 상태를 저장하지 못했어요. 잠시 후 다시 시도하세요.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-title font-bold text-ink">몸 상태를 알려주세요</h1>
                <p className="mt-1 text-body-sm text-ink-2">AI가 아픈 곳은 피하고, 몸에 맞는 루틴을 짜요. 건너뛰어도 돼요.</p>
            </div>

            <div className="flex flex-col gap-6">
                <div>
                    <p id="onboarding-pain" className="text-body-sm font-medium text-ink">
                        아프거나 다친 부위<span className="ml-1 font-normal text-ink-2">(선택, 여러 개)</span>
                    </p>
                    <p id="onboarding-pain-hint" className="mb-2 mt-0.5 text-caption text-ink-2">
                        고른 부위에 부담이 가는 운동은 루틴에서 빼요.
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="onboarding-pain" aria-describedby="onboarding-pain-hint">
                        <ToggleChip pressed={painSelection !== null && painSelection.length === 0} onClick={() => choosePain([])}>
                            없어요
                        </ToggleChip>
                        {parts.map((slug) => (
                            <ToggleChip key={slug} pressed={selected.includes(slug)} onClick={() => choosePain(togglePainArea(painSelection, slug))}>
                                {muscleLabel(slug)}
                            </ToggleChip>
                        ))}
                    </div>
                </div>

                <TextField
                    label="현재 체중"
                    optional
                    type="number"
                    inputMode="decimal"
                    min={NUMERIC_RANGES.bodyWeightKg.min}
                    max={NUMERIC_RANGES.bodyWeightKg.max}
                    step={NUMERIC_RANGES.bodyWeightKg.step}
                    suffix="kg"
                    value={weight}
                    onChange={(e) => {
                        setWeight(e.target.value)
                        if (weightError) setWeightError(undefined)
                    }}
                    placeholder={latestWeight != null ? `최근 기록 ${Number(latestWeight.toFixed(1))}kg` : "예: 70"}
                    hint="입력하면 오늘 체성분 기록에도 남겨요."
                    error={weightError}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Button variant="primary" size="lg" block loading={saving} onClick={handleSave}>
                    {saving ? "저장하고 있어요" : "다음"}
                </Button>
                <Button variant="ghost" size="lg" block disabled={saving} onClick={() => onNext({ weightSaved: false })}>
                    나중에 할게요
                </Button>
            </div>
        </div>
    )
}
