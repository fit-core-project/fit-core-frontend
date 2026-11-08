"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw } from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel"
import { RoutineFormState, assembleRoutineRequest } from "@/utils/requestAssembler"
import { getUserPreferences } from "@/services/userDataService"
import { generateRoutine } from "@/services/aiRoutineService"
import { GenerateState } from "@/types/state"
import { clearProgramContext } from "@/utils/programContext"
import { equipmentLabel, goalLabel, muscleLabel } from "@/utils/displayLabels"
import { lineForRoutine, type RouteLine } from "@/utils/routeLine"
import { Button, Notice, Section, Sheet, Skeleton, Surface, TextAreaField, ToggleChip } from "@/components/ui"

type Equipment = "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT"
const DEFAULT_AVAILABLE_EQUIPMENT: Equipment[] = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"]

const LOADING_MESSAGES = [
    "선택한 운동 부위를 기준으로 루틴을 구성하고 있어요.",
    "컨디션과 장비 정보를 반영해 운동 순서를 조정하고 있어요.",
    "무리하지 않도록 세트와 반복 수를 맞추는 중이에요.",
    "운동 흐름이 자연스럽도록 루틴을 정리하고 있어요.",
    "잠시만 기다려 주세요. 오늘 수행할 수 있는 루틴을 준비하고 있어요.",
    "선택한 조건에 맞춰 대체 운동 가능성을 확인하고 있어요.",
    "운동 강도와 휴식 구성을 점검하고 있어요.",
]

const EQUIPMENTS: Equipment[] = ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"]

const GOALS: RoutineFormState["goal"][] = ["hypertrophy", "strength", "fatLoss", "recomposition", "generalFitness"]

const PRESET_GROUPS = {
    PUSH: ["chest", "front-deltoids", "triceps"],
    PULL: ["upper-back", "trapezius", "biceps", "forearm", "back-deltoids"],
    LEGS: ["quadriceps", "hamstring", "gluteal", "calves", "adductor", "abductors"],
    CORE: ["abs", "lower-back", "obliques"],
}

const PRESETS: { key: keyof typeof PRESET_GROUPS; label: string; line: RouteLine }[] = [
    { key: "PUSH", label: "밀기", line: "push" },
    { key: "PULL", label: "당기기", line: "pull" },
    { key: "LEGS", label: "하체", line: "legs" },
    { key: "CORE", label: "코어", line: "core" },
]

const GOAL_MAP: Record<string, RoutineFormState["goal"]> = {
    strength: "strength",
    hypertrophy: "hypertrophy",
    fatLoss: "fatLoss",
    recomposition: "recomposition",
    generalFitness: "generalFitness",
}

const normalizeTimeAvailable = (value: unknown): number => {
    const parsed = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return 60
    return Math.min(120, Math.max(30, Math.round(parsed / 15) * 15))
}

export default function RoutineGenerator() {
    const router = useRouter()
    const [status, setStatus] = useState<GenerateState>("idle")
    const [isPrefsLoading, setIsPrefsLoading] = useState(true)
    const [isUsingDefaultEquipment, setIsUsingDefaultEquipment] = useState(false)
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
    const cancelledRef = useRef(false)

    const [formData, setFormData] = useState<RoutineFormState>({
        targetMuscles: [],
        equipment: DEFAULT_AVAILABLE_EQUIPMENT,
        timeAvailable: 60,
        painAreas: [],
        domsData: {},
        goal: "hypertrophy",
        userNote: "",
        targetSplitLabel: undefined,
        readinessLevel: "normal",
    })

    // AnatomyModel용 데이터 상태 (선택된 근육은 1, 아니면 없는 것으로 취급)
    const [targetModelData, setTargetModelData] = useState<Record<string, number>>({})

    const domsSummary = useMemo(() => {
        const count = Object.keys(formData.domsData).length
        return count > 0 ? `컨디션 체크에서 ${count}개 부위에 피로가 있다고 했어요.` : ""
    }, [formData.domsData])

    useEffect(() => {
        const savedDoms = localStorage.getItem("fitcore_doms_data")
        const savedPainAreas = localStorage.getItem("fitcore_pain_areas")

        // 1. "undefined" 문자열과 파싱 에러를 막아주는 안전망 함수
        const safeParse = <T,>(value: string | null, fallback: T): T => {
            if (!value || value === "undefined") return fallback
            try {
                return JSON.parse(value) as T
            } catch {
                return fallback
            }
        }

        // 2. 안전망 함수를 통과시켜서 파싱
        const parsedDoms = safeParse<Record<string, number>>(savedDoms, {})
        const parsedPainAreas = safeParse<string[]>(savedPainAreas, [])

        getUserPreferences()
            .then((prefs) => {
                const hasProfileEquipment = !!(prefs.equipment && prefs.equipment.length > 0)
                setIsUsingDefaultEquipment(!hasProfileEquipment)
                setFormData((prev) => ({
                    ...prev,
                    domsData: parsedDoms,
                    painAreas: parsedPainAreas,
                    timeAvailable: normalizeTimeAvailable(prefs.timeAvailable),
                    equipment: hasProfileEquipment
                        ? (prefs.equipment as RoutineFormState["equipment"])
                        : prev.equipment,
                    goal: GOAL_MAP[prefs.goal] ?? "hypertrophy",
                }))
            })
            .catch(() => {
                setIsUsingDefaultEquipment(true)
                setFormData((prev) => ({
                    ...prev,
                    domsData: parsedDoms,
                    painAreas: parsedPainAreas,
                }))
            })
            .finally(() => setIsPrefsLoading(false))
    }, [])

    useEffect(() => {
        if (status !== "loading") return
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
        }, 1800)
        return () => {
            clearInterval(interval)
            setLoadingMsgIndex(0)
        }
    }, [status])

    const handlePresetClick = (groupKey: keyof typeof PRESET_GROUPS) => {
        const musclesToAdd = PRESET_GROUPS[groupKey]

        setTargetModelData((prev) => {
            const newData = { ...prev }
            musclesToAdd.forEach((m) => {
                newData[m] = 1
            })
            return newData
        })

        setFormData((prev: RoutineFormState) => {
            const current = new Set(prev.targetMuscles)
            musclesToAdd.forEach((m) => current.add(m))
            return { ...prev, targetMuscles: Array.from(current), targetSplitLabel: groupKey.toLowerCase() }
        })
    }

    const handleTargetMuscleClick = (muscleName: string) => {
        setTargetModelData((prev) => {
            const newData = { ...prev }
            if (newData[muscleName]) delete newData[muscleName]
            else newData[muscleName] = 1
            return newData
        })

        setFormData((prev: RoutineFormState) => {
            const current = prev.targetMuscles
            if (current.includes(muscleName)) {
                return { ...prev, targetMuscles: current.filter((m: string) => m !== muscleName) }
            } else {
                return {
                    ...prev,
                    targetMuscles: [...current, muscleName],
                    targetSplitLabel: prev.targetSplitLabel ?? "custom",
                }
            }
        })
    }

    const handleResetClick = () => {
        setTargetModelData({})
        setFormData((prev: RoutineFormState) => ({ ...prev, targetMuscles: [], targetSplitLabel: undefined }))
    }

    const toggleArrayItem = (key: keyof RoutineFormState, value: string) => {
        setFormData((prev: RoutineFormState) => {
            const currentArray = prev[key] as string[]
            if (currentArray.includes(value)) {
                return { ...prev, [key]: currentArray.filter((item) => item !== value) }
            } else {
                return { ...prev, [key]: [...currentArray, value] }
            }
        })
    }

    const handleClose = () => {
        if (status === "loading") {
            setLeaveConfirmOpen(true)
            return
        }
        router.push("/ai_routine")
    }

    const leaveGenerating = () => {
        // The request keeps running server-side; this makes its late result a no-op.
        cancelledRef.current = true
        router.push("/ai_routine")
    }

    const handleSubmit = async () => {
        cancelledRef.current = false
        setStatus("loading")
        clearProgramContext()
        try {
            const payload = assembleRoutineRequest(formData)
            const routineDraft = await generateRoutine(payload)
            if (cancelledRef.current) return
            if (routineDraft.generationStatus === "failed") {
                setStatus("hardFailed")
                return
            }
            localStorage.setItem("fitcore_active_routine", JSON.stringify(routineDraft))
            localStorage.setItem("fitcore_unavailable_equipment", JSON.stringify(payload.unavailableEquipment))
            setStatus(routineDraft.isFallback ? "fallback" : "success")
            router.push("/routine/draft")
        } catch {
            if (cancelledRef.current) return
            setStatus("retryableFailed")
        }
    }

    const hasTargets = formData.targetMuscles.length > 0
    const routeLine = lineForRoutine(formData.targetSplitLabel, formData.targetMuscles)

    return (
        <div className="flex min-h-full w-full flex-col bg-ground">
            <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-hairline bg-ground px-2 py-1.5">
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="컨디션 체크로 돌아가기"
                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                >
                    <ArrowLeft className="size-5" aria-hidden />
                </button>
                <h1 className="min-w-0 flex-1 truncate text-body font-bold text-ink">루틴 세부 설정</h1>
            </header>

            <div className="flex flex-1 flex-col gap-8 px-4 py-5">
                {isPrefsLoading ? (
                    <div aria-busy="true" className="flex flex-col gap-2">
                        <span className="sr-only">내 운동 설정을 불러오는 중이에요</span>
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ) : (
                    domsSummary && <Notice>{domsSummary} 그 부위는 AI가 운동량을 줄여요.</Notice>
                )}

                <Section
                    title="오늘 운동 부위"
                    action={
                        <Button
                            variant="ghost"
                            onClick={handleResetClick}
                            disabled={!hasTargets}
                            icon={<RefreshCw className="size-4" aria-hidden />}
                            className="-mr-2"
                        >
                            초기화
                        </Button>
                    }
                >
                    <div role="group" aria-label="분할로 한 번에 고르기" className="grid grid-cols-4 gap-2">
                        {PRESETS.map((preset) => (
                            <ToggleChip
                                key={preset.key}
                                line={preset.line}
                                pressed={PRESET_GROUPS[preset.key].every((m) => formData.targetMuscles.includes(m))}
                                onClick={() => handlePresetClick(preset.key)}
                                className="px-2"
                            >
                                {preset.label}
                            </ToggleChip>
                        ))}
                    </div>

                    <Surface tone="sunken">
                        <AnatomyModel data={targetModelData} onMuscleClick={handleTargetMuscleClick} mode="target" />
                    </Surface>

                    <p className="text-body-sm text-ink-2">
                        {hasTargets
                            ? `고른 부위: ${formData.targetMuscles.map(muscleLabel).join(", ")}`
                            : "인체도에서 부위를 누르거나 분할을 고르세요."}
                    </p>
                </Section>

                <Section
                    title="운동 시간"
                    action={<span className="text-body font-bold tabular-nums text-ink">{formData.timeAvailable}분</span>}
                >
                    <div>
                        <label htmlFor="time-available" className="sr-only">
                            운동 시간(분)
                        </label>
                        <input
                            id="time-available"
                            type="range"
                            min="30"
                            max="120"
                            step="15"
                            value={formData.timeAvailable}
                            aria-valuetext={`${formData.timeAvailable}분`}
                            onChange={(e) => setFormData({ ...formData, timeAvailable: parseInt(e.target.value) })}
                            className="min-h-11 w-full cursor-pointer accent-ink"
                        />
                        <div className="flex justify-between text-caption text-ink-2" aria-hidden>
                            <span>30분</span>
                            <span>120분</span>
                        </div>
                    </div>
                </Section>

                <Section title="훈련 목표">
                    <div role="group" aria-label="훈련 목표, 하나만 고르기" className="flex flex-wrap gap-2">
                        {GOALS.map((goal) => (
                            <ToggleChip
                                key={goal}
                                pressed={formData.goal === goal}
                                onClick={() => setFormData({ ...formData, goal })}
                            >
                                {goalLabel(goal)}
                            </ToggleChip>
                        ))}
                    </div>
                </Section>

                <Section title="사용할 장비">
                    {isUsingDefaultEquipment && (
                        <Notice>
                            프로필에 장비 설정이 없어 모든 장비를 쓸 수 있다고 보고 만들어요.{" "}
                            <Link href="/my?tab=workout" className="font-bold underline underline-offset-2">
                                장비 설정하기
                            </Link>
                        </Notice>
                    )}
                    <div role="group" aria-label="사용할 장비, 여러 개 고르기" className="flex flex-wrap gap-2">
                        {EQUIPMENTS.map((value) => (
                            <ToggleChip
                                key={value}
                                pressed={formData.equipment?.includes(value) ?? false}
                                onClick={() => toggleArrayItem("equipment", value)}
                            >
                                {equipmentLabel(value)}
                            </ToggleChip>
                        ))}
                    </div>
                </Section>

                <TextAreaField
                    label="AI 코치에게 남길 말"
                    optional
                    rows={4}
                    value={formData.userNote}
                    onChange={(e) => setFormData({ ...formData, userNote: e.target.value })}
                    placeholder="예: 무릎이 안 좋으니 스쿼트는 빼 주세요."
                />

                <p className="text-caption text-ink-2">
                    루틴과 중량은 AI가 만든 참고용 안내예요. 의학적 진단이나 치료를 대신하지 않아요. 운동 중 통증이나
                    이상이 느껴지면 바로 멈추세요.
                </p>
            </div>

            <div className="sticky bottom-0 z-10 mt-auto border-t border-hairline bg-ground px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {!hasTargets && <p className="mb-2 text-caption text-ink-2">운동할 부위를 하나 이상 고르세요.</p>}
                <Button
                    variant="primary"
                    size="lg"
                    block
                    line={routeLine}
                    onClick={handleSubmit}
                    disabled={!hasTargets}
                    loading={status === "loading"}
                >
                    루틴 만들기
                </Button>
            </div>

            <Sheet
                open={status === "retryableFailed"}
                onClose={() => setStatus("idle")}
                title="서버에 연결하지 못했어요"
                description="응답이 늦어지고 있어요. 잠시 뒤 다시 시도하세요."
                footer={
                    <Button variant="primary" size="lg" block onClick={handleSubmit} icon={<RefreshCw className="size-4" aria-hidden />}>
                        다시 시도하기
                    </Button>
                }
            >
                <p className="text-body-sm text-ink-2">고른 조건은 그대로 남아 있어요.</p>
            </Sheet>

            <Sheet
                open={status === "hardFailed"}
                onClose={() => setStatus("idle")}
                title="루틴을 만들 수 없어요"
                description="고른 조건에 맞는 운동이 없어요."
                footer={
                    <Button variant="primary" size="lg" block onClick={() => setStatus("idle")}>
                        조건 바꾸기
                    </Button>
                }
            >
                <p className="text-body-sm text-ink-2">운동 부위나 장비를 바꾼 뒤 다시 만들어 보세요.</p>
            </Sheet>

            <Sheet
                open={leaveConfirmOpen}
                onClose={() => setLeaveConfirmOpen(false)}
                title="루틴 만들기를 그만둘까요?"
                description="지금 나가면 만들던 루틴은 저장되지 않아요."
                footer={
                    <div className="flex gap-2">
                        <Button variant="secondary" size="lg" block onClick={() => setLeaveConfirmOpen(false)}>
                            계속 기다리기
                        </Button>
                        <Button variant="danger" size="lg" block onClick={leaveGenerating}>
                            나가기
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2">조금만 기다리면 루틴이 완성돼요.</p>
            </Sheet>

            {/* 로딩: 루틴 확인 화면 모양의 전체 화면 스켈레톤 */}
            {status === "loading" && (
                <div className="fixed inset-0 z-50 flex justify-center bg-ink/20">
                    <div aria-busy="true" className="h-full w-full max-w-[480px] overflow-y-auto bg-ground">
                        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-hairline bg-ground px-4 py-4">
                            <div className="min-w-0">
                                <p className="text-body font-bold text-ink">루틴을 만들고 있어요</p>
                                <p role="status" aria-live="polite" className="mt-1 text-body-sm text-ink-2">
                                    {LOADING_MESSAGES[loadingMsgIndex]}
                                </p>
                            </div>
                            <Button variant="ghost" className="-mr-2 shrink-0" onClick={() => setLeaveConfirmOpen(true)}>
                                그만두기
                            </Button>
                        </div>
                        <ol className="flex flex-col px-4 py-5" aria-hidden>
                            {[72, 56, 64, 48].map((titleWidth, i) => (
                                <li key={i} className="flex gap-3">
                                    <div className="flex w-4 flex-col items-center">
                                        <span className="mt-1 size-4 shrink-0 rounded-full border-[3px] border-rail bg-ground" />
                                        {i < 3 && <span className="w-1 flex-1 bg-rail" />}
                                    </div>
                                    <div className="flex flex-1 flex-col gap-2 pb-6">
                                        <Skeleton className="h-5" style={{ width: `${titleWidth}%` }} />
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-11 w-full" />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    )
}
