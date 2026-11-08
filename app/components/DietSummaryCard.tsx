"use client"

import { startTransition, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Sparkles } from "lucide-react"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import nutritionTargetApiClient from "@/lib/api/nutrition/nutritionTargetApiClient"
import type { DietSummaryResponse, NutritionTarget } from "@/types/project"
import { Button, Notice, Section, Sheet, Skeleton, Surface } from "@/components/ui"

const pct = (current: number, limit: number | null | undefined) => (!limit ? 0 : Math.min((current / limit) * 100, 100))

/** A thin meter; over its limit (or under a minimum) it turns to the danger colour. */
function Meter({ value, warn, label }: { value: number; warn: boolean; label: string }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-hairline" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
            <div className={`h-full rounded-full ${warn ? "bg-danger" : "bg-ink"}`} style={{ width: `${value}%` }} />
        </div>
    )
}

export default function DietSummaryCard({
    showDetails = true,
    onManualAdd,
    onAiLog,
    refreshKey,
}: {
    showDetails?: boolean
    onManualAdd?: () => void
    onAiLog?: () => void
    refreshKey?: number
}) {
    const router = useRouter()
    const [summary, setSummary] = useState<DietSummaryResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [target, setTarget] = useState<NutritionTarget | null>(null)
    const [optionsOpen, setOptionsOpen] = useState(false)

    useEffect(() => {
        startTransition(() => {
            setLoading(true)
            setError(false)
        })
        dietApiClient
            .getToday()
            .then((data) => startTransition(() => setSummary(data)))
            .catch(() => startTransition(() => setError(true)))
            .finally(() => startTransition(() => setLoading(false)))

        nutritionTargetApiClient.getTarget().then((t) => startTransition(() => setTarget(t)))
    }, [refreshKey])

    const totalKcal = summary?.totalKcal ?? 0
    const kcalGoal = target?.kcalGoal ?? null
    const hasItems = !!summary && summary.items.length > 0
    const sugar = Number(summary?.totalSugarG ?? 0)
    const fiber = Number(summary?.totalFiberG ?? 0)
    const sodium = summary?.totalSodiumMg ?? 0

    const startAiLog = () => (onAiLog ? onAiLog() : router.push("/ai_quicklog"))

    const recordButtons = (
        <div className="grid grid-cols-2 gap-2">
            <Button
                variant="secondary"
                icon={<Plus className="size-4" aria-hidden />}
                onClick={() => {
                    setOptionsOpen(false)
                    onManualAdd?.()
                }}
            >
                직접 기록
            </Button>
            <Button
                variant="primary"
                icon={<Sparkles className="size-4" aria-hidden />}
                onClick={() => {
                    setOptionsOpen(false)
                    startAiLog()
                }}
            >
                말로 기록
            </Button>
        </div>
    )

    const goalHint = !kcalGoal && (
        <p className="text-caption text-ink-2">
            목표 칼로리를 정하면 목표 대비 섭취량을 볼 수 있어요.{" "}
            <Link href="/my?tab=nutrition" className="font-bold text-ink underline underline-offset-2">
                목표 정하기
            </Link>
        </p>
    )

    const renderBody = () => {
        if (loading) {
            return (
                <Surface className="flex flex-col gap-3" aria-busy="true">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-1.5 w-full" />
                    <Skeleton className="h-10 w-full" />
                </Surface>
            )
        }
        if (error) return <Notice tone="danger">오늘 식단을 불러오지 못했어요.</Notice>
        if (!hasItems) {
            return (
                <Surface className="flex flex-col gap-3">
                    <div>
                        <p className="text-body font-bold text-ink">오늘 식단 기록이 없어요</p>
                        <p className="mt-0.5 text-body-sm text-ink-2">‘점심에 제육볶음 한 그릇’처럼 말로 적어도 돼요.</p>
                    </div>
                    {onManualAdd ? recordButtons : <Button variant="secondary" onClick={() => router.push("/nutrition")}>식단 보기</Button>}
                    {goalHint}
                </Surface>
            )
        }
        return (
            <Surface className="flex flex-col gap-4">
                <button type="button" onClick={() => router.push("/nutrition")} className="flex flex-col gap-2 text-left">
                    <span className="flex items-baseline gap-1.5">
                        <span className="text-headline font-bold tabular-nums text-ink">{totalKcal.toLocaleString()}</span>
                        <span className="text-body-sm text-ink-2 tabular-nums">{kcalGoal ? `/ ${kcalGoal.toLocaleString()} kcal` : "kcal"}</span>
                    </span>
                    {kcalGoal && <Meter label="목표 대비 칼로리" value={pct(totalKcal, kcalGoal)} warn={totalKcal > kcalGoal} />}
                    <span className="grid grid-cols-3 gap-2 pt-1">
                        {[
                            ["탄수화물", summary!.totalCarbsG ?? 0],
                            ["단백질", summary!.totalProteinG ?? 0],
                            ["지방", summary!.totalFatG ?? 0],
                        ].map(([label, value]) => (
                            <span key={label} className="flex flex-col">
                                <span className="text-caption text-ink-2">{label}</span>
                                <span className="text-title-sm font-bold tabular-nums text-ink">
                                    {value}
                                    <span className="ml-0.5 text-caption font-normal text-ink-2">g</span>
                                </span>
                            </span>
                        ))}
                    </span>
                </button>

                {showDetails && (
                    <div className="grid grid-cols-3 gap-3 border-t border-hairline pt-3">
                        {[
                            { label: "당류", value: sugar, unit: "g", limit: target?.sugarMax, hint: target?.sugarMax != null ? `~${target.sugarMax}g` : null, warn: target?.sugarMax != null && sugar > target.sugarMax, pctValue: pct(sugar, target?.sugarMax) },
                            { label: "식이섬유", value: fiber, unit: "g", limit: target?.fiberMin, hint: target?.fiberMin != null ? `${target.fiberMin}g~` : null, warn: target?.fiberMin != null && fiber < target.fiberMin, pctValue: pct(fiber, target?.fiberMin) },
                            { label: "나트륨", value: sodium, unit: "mg", limit: target?.sodiumMax, hint: target?.sodiumMax != null ? `~${target.sodiumMax}mg` : null, warn: target?.sodiumMax != null && sodium > target.sodiumMax, pctValue: pct(sodium, target?.sodiumMax) },
                        ].map((item) => (
                            <div key={item.label} className="flex flex-col gap-1">
                                <span className="text-caption text-ink-2">{item.label}</span>
                                <span className="text-body font-bold tabular-nums text-ink">
                                    {item.value}
                                    <span className="ml-0.5 text-caption font-normal text-ink-2">{item.unit}</span>
                                </span>
                                {item.limit != null && <Meter label={`${item.label} 기준 대비`} value={item.pctValue} warn={item.warn} />}
                                {item.hint && <span className="text-caption text-ink-2 tabular-nums">{item.hint}</span>}
                            </div>
                        ))}
                        <p className="col-span-3 text-caption text-ink-2">당류·식이섬유·나트륨은 식품 DB와 맞춘 항목만 합산해요.</p>
                    </div>
                )}
                {goalHint}
            </Surface>
        )
    }

    return (
        <Section
            title="오늘의 영양"
            action={
                !loading && hasItems ? (
                    <Button variant="ghost" icon={<Plus className="size-4" aria-hidden />} onClick={() => setOptionsOpen(true)}>
                        기록
                    </Button>
                ) : undefined
            }
        >
            {renderBody()}
            <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="식단 기록" description="먹은 음식을 직접 고르거나 말로 적을 수 있어요.">
                {recordButtons}
            </Sheet>
        </Section>
    )
}
