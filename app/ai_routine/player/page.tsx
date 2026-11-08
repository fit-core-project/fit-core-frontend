"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Pause, Play, X } from "lucide-react"
import { RoutineDraft } from "@/types/routine"
import workoutApiClient, { WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"
import { getKstToday } from "@/utils/date"
import { WorkoutState } from "@/types/state"
import { toast } from "sonner"
import type { ProgramPlayerContext } from "@/types/program"
import { clearProgramContext, readValidProgramContext } from "@/utils/programContext"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR } from "@/utils/routeLine"
import { Button, LineBadge, Notice, Route, Sheet, Skeleton, type StationData } from "@/components/ui"

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
}

const weightText = (kg: number | null) => (kg !== null ? `${kg}` : "맨몸")

export default function WorkoutPlayer() {
    const router = useRouter()

    const [routine, setRoutine] = useState<RoutineDraft | null>(null)
    const [routineFinalId, setRoutineFinalId] = useState<string | null>(null)
    const [programContext, setProgramContext] = useState<ProgramPlayerContext | null>(null)
    const [checkedSets, setCheckedSets] = useState<Set<string>>(new Set())
    const [splitLabelCode, setSplitLabelCode] = useState<string | null>(null)

    const [isTimerActive, setIsTimerActive] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [timeLeft, setTimeLeft] = useState(0)
    const [exitOpen, setExitOpen] = useState(false)

    const [workoutStatus, setWorkoutStatus] = useState<WorkoutState>("idle")
    const pendingPayload = useRef<WorkoutSaveRequest | null>(null)
    const pendingProgramContext = useRef<ProgramPlayerContext | null>(null)
    const workoutStartTime = useRef<number>(0)

    // Absolute end time survives background tabs; pausedAt shifts it on resume.
    const endTimeRef = useRef<number>(0)
    const pausedAtRef = useRef<number>(0)
    const currentStationRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        workoutStartTime.current = Date.now()
        const savedRoutine = localStorage.getItem("fitcore_active_routine")
        const savedFinalId = localStorage.getItem("fitcore_routine_final_id")
        const savedProgramContext = readValidProgramContext(savedFinalId)
        setSplitLabelCode(localStorage.getItem("fitcore_split_label"))
        if (savedRoutine) {
            let parsedRoutine: RoutineDraft
            try {
                parsedRoutine = JSON.parse(savedRoutine) as RoutineDraft
            } catch {
                toast.error("루틴 데이터가 손상되었어요.")
                router.push("/ai_routine")
                return
            }
            setRoutine(parsedRoutine)
            setWorkoutStatus("inProgress")
            // Restore progress only when it belongs to this routine.
            const savedProgress = localStorage.getItem("fitcore_player_progress")
            if (savedProgress) {
                try {
                    const { routineId, checkedSets: saved } = JSON.parse(savedProgress) as { routineId: string; checkedSets: string[] }
                    const currentId = savedFinalId ?? parsedRoutine.routineDraftId
                    if (routineId === currentId && Array.isArray(saved) && saved.length > 0) {
                        setCheckedSets(new Set(saved))
                    }
                } catch { /* malformed, ignore */ }
            }
        } else {
            toast.error("진행 중인 루틴이 없어요.")
            router.push("/ai_routine")
        }
        if (savedFinalId) setRoutineFinalId(savedFinalId)
        if (savedProgramContext) setProgramContext(savedProgramContext)
    }, [router])

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow
        const previousHtmlOverflow = document.documentElement.style.overflow
        document.body.style.overflow = "hidden"
        document.documentElement.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = previousBodyOverflow
            document.documentElement.style.overflow = previousHtmlOverflow
        }
    }, [])

    const scrollToCurrent = useCallback(() => {
        setTimeout(() => currentStationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
    }, [])

    // Single exit point for rest: tick reaching zero, skip, and visibility recalculation.
    const finishRest = useCallback(() => {
        setIsTimerActive(false)
        setIsPaused(false)
        setTimeLeft(0)
        scrollToCurrent()
    }, [scrollToCurrent])

    useEffect(() => {
        if (!isTimerActive || isPaused) return
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
            setTimeLeft(remaining)
            if (remaining === 0) finishRest()
        }
        const id = setInterval(tick, 500)
        return () => clearInterval(id)
    }, [isTimerActive, isPaused, finishRest])

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState !== "visible") return
            if (!isTimerActive || isPaused) return
            const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
            if (remaining === 0) finishRest()
            else setTimeLeft(remaining)
        }
        document.addEventListener("visibilitychange", onVisibilityChange)
        return () => document.removeEventListener("visibilitychange", onVisibilityChange)
    }, [isTimerActive, isPaused, finishRest])

    useEffect(() => {
        if (!routine || workoutStatus !== "inProgress") return
        const routineId = routineFinalId ?? routine.routineDraftId
        if (!routineId) return
        localStorage.setItem("fitcore_player_progress", JSON.stringify({ routineId, checkedSets: [...checkedSets] }))
    }, [checkedSets, routine, routineFinalId, workoutStatus])

    const line = useMemo(
        () => lineForRoutine(splitLabelCode, routine?.routineBlocks.flatMap((block) => block.primaryMuscles ?? []) ?? []),
        [splitLabelCode, routine],
    )

    if (workoutStatus === "idle" || !routine) {
        return (
            <main className="absolute inset-0 flex flex-col gap-3 bg-ground p-4" aria-busy="true">
                <span className="sr-only">루틴을 불러오는 중…</span>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="mt-6 h-24 w-full" />
                <Skeleton className="h-10 w-3/4" />
            </main>
        )
    }

    const blocks = routine.routineBlocks
    const totalSets = blocks.reduce((acc, block) => acc + block.prescription.length, 0)
    const allSetsComplete = totalSets > 0 && checkedSets.size === totalSets
    const progressPercent = totalSets === 0 ? 0 : Math.round((checkedSets.size / totalSets) * 100)
    const isSaving = workoutStatus === "saving"

    // The current station is the first block with an unchecked set; its first unchecked set is next.
    const currentBlockIndex = blocks.findIndex((block, bi) => block.prescription.some((_, si) => !checkedSets.has(`${bi}-${si}`)))
    const currentSetIndex =
        currentBlockIndex < 0 ? -1 : blocks[currentBlockIndex].prescription.findIndex((_, si) => !checkedSets.has(`${currentBlockIndex}-${si}`))
    const currentSet = currentBlockIndex < 0 ? null : blocks[currentBlockIndex].prescription[currentSetIndex]

    const toggleSet = (blockIndex: number, setArrayIndex: number, restSec: number) => {
        const key = `${blockIndex}-${setArrayIndex}`
        const next = new Set(checkedSets)
        if (next.has(key)) {
            next.delete(key)
            setCheckedSets(next)
            return
        }
        next.add(key)
        setCheckedSets(next)
        if (next.size === totalSets) {
            setIsTimerActive(false)
            return
        }
        endTimeRef.current = Date.now() + restSec * 1000
        setTimeLeft(restSec)
        setIsPaused(false)
        setIsTimerActive(true)
        scrollToCurrent()
    }

    const completeCurrentSet = () => {
        if (!currentSet) return
        toggleSet(currentBlockIndex, currentSetIndex, currentSet.targetRestSec)
    }

    const handlePause = () => {
        pausedAtRef.current = Date.now()
        setIsPaused(true)
    }

    const handleResume = () => {
        endTimeRef.current += Date.now() - pausedAtRef.current
        setIsPaused(false)
    }

    const handleFinishRPE = async (rpeScore: number) => {
        setWorkoutStatus("saving")

        const workoutDate = getKstToday()
        const durationMin = Math.max(1, Math.round((Date.now() - workoutStartTime.current) / 60_000))

        const DOMS_LEVEL_MAP: Record<number, string> = { 1: "mild", 2: "moderate", 3: "severe" }
        const painAreas: string[] = JSON.parse(localStorage.getItem("fitcore_pain_areas") || "[]")
        const domsRaw: Record<string, number> = JSON.parse(localStorage.getItem("fitcore_doms_data") || "{}")
        const currentDoms = Object.entries(domsRaw)
            .filter(([, v]) => DOMS_LEVEL_MAP[v] !== undefined)
            .map(([bodyPart, v]) => ({ bodyPart, level: DOMS_LEVEL_MAP[v] }))
        const unavailableEquipment: string[] = JSON.parse(localStorage.getItem("fitcore_unavailable_equipment") || "[]")

        const sets = blocks.flatMap((block, blockIndex) =>
            block.prescription.map((set, index) => ({
                exerciseOrder: blockIndex + 1,
                exerciseId: block.exerciseId,
                exerciseNameSnapshot: block.exerciseName,
                setIndex: index + 1,
                setType: "working",
                trackingMode: "weightReps",
                weightKg: set.targetWeightKg,
                reps: set.targetReps,
                rir: set.targetRir,
                rpe: rpeScore,
                isFailure: false,
                restSec: set.targetRestSec,
            }))
        )

        const routineTitle = routine.summaryTitle || splitLabelCode || "오늘의 루틴"

        const validProgramContext = readValidProgramContext(routineFinalId)
        setProgramContext(validProgramContext)
        if (programContext && !validProgramContext) {
            toast.error("프로그램 정보가 현재 루틴과 맞지 않아 일반 운동으로 저장해요.")
        }

        const finalWorkoutData: WorkoutSaveRequest = {
            workoutDate,
            splitLabel: routineTitle,
            sourceRoutineFinalId: validProgramContext?.routineFinalId ?? routineFinalId,
            ...(validProgramContext
                ? { programId: validProgramContext.programId, programItemId: validProgramContext.programItemId }
                : {}),
            timeAvailableMin: routine.totalEstimatedTime,
            durationMin,
            readinessLevel: "normal",
            currentPainAreas: painAreas,
            currentDoms,
            unavailableEquipment,
            sets,
        }

        pendingPayload.current = finalWorkoutData
        pendingProgramContext.current = validProgramContext
        await trySave(finalWorkoutData, validProgramContext)
    }

    const clearWorkoutStorage = () => {
        localStorage.removeItem("fitcore_active_routine")
        localStorage.removeItem("fitcore_doms_data")
        localStorage.removeItem("fitcore_pain_areas")
        localStorage.removeItem("fitcore_routine_final_id")
        clearProgramContext()
        localStorage.removeItem("fitcore_split_label")
        localStorage.removeItem("fitcore_unavailable_equipment")
        localStorage.removeItem("fitcore_failed_workout_save")
        localStorage.removeItem("fitcore_player_progress")
    }

    const trySave = async (payload: WorkoutSaveRequest, contextSnapshot: ProgramPlayerContext | null = pendingProgramContext.current) => {
        setWorkoutStatus("saving")
        try {
            await workoutApiClient.save(payload)
            const redirectToProgram = contextSnapshot?.programId
            clearWorkoutStorage()
            pendingProgramContext.current = null
            setProgramContext(null)
            setWorkoutStatus("saved")
            router.push(redirectToProgram ? `/workout/programs/${redirectToProgram}` : "/workout")
        } catch (err) {
            console.error("[player] POST /api/workouts failed:", err)
            localStorage.setItem("fitcore_failed_workout_save", JSON.stringify(payload))
            setWorkoutStatus("saveFailed")
        }
    }

    const handleRetry = () => {
        if (pendingPayload.current) trySave(pendingPayload.current, pendingProgramContext.current)
    }

    const handleDiscardWorkout = () => {
        clearWorkoutStorage()
        router.push("/workout")
    }

    if (workoutStatus === "saveFailed") {
        return (
            <main className="absolute inset-0 flex flex-col justify-center gap-6 bg-ground p-6">
                <div>
                    <h1 className="text-headline font-bold text-ink">기록을 저장하지 못했어요</h1>
                    <p className="mt-2 text-body text-ink-2">네트워크 문제로 저장이 실패했어요. 다시 시도하면 지금 기록이 그대로 저장돼요.</p>
                </div>
                <Notice tone="danger">저장하지 않고 나가면 이번 운동 기록은 남지 않아요.</Notice>
                <div className="flex flex-col gap-2">
                    <Button variant="primary" size="lg" block line={line} loading={isSaving} onClick={handleRetry}>
                        다시 저장
                    </Button>
                    <Button variant="ghost" size="lg" block disabled={isSaving} onClick={handleDiscardWorkout}>
                        저장하지 않고 나가기
                    </Button>
                </div>
            </main>
        )
    }

    if (allSetsComplete) {
        const options = [
            { score: 1, label: "쉬웠어요", hint: "다음엔 볼륨을 늘려요" },
            { score: 2, label: "적당했어요", hint: "지금 강도를 유지해요" },
            { score: 3, label: "힘들었어요", hint: "다음엔 볼륨을 줄여요" },
        ]
        return (
            <main className="absolute inset-0 flex flex-col bg-ground">
                <div className="flex flex-1 flex-col justify-center gap-6 p-6">
                    <div>
                        <LineBadge line={line} />
                        <h1 className="mt-3 text-headline font-bold text-ink">종점 도착</h1>
                        <p className="mt-1 text-body text-ink-2 tabular-nums">
                            {blocks.length}개 운동 · {totalSets}세트를 모두 마쳤어요.
                        </p>
                    </div>
                    <fieldset className="flex flex-col gap-2" disabled={isSaving}>
                        <legend className="mb-2 text-title-sm font-bold text-ink">오늘 강도는 어땠나요?</legend>
                        {options.map((option) => (
                            <button
                                key={option.score}
                                type="button"
                                onClick={() => handleFinishRPE(option.score)}
                                className="flex min-h-14 items-center justify-between rounded-control border border-rail bg-ground px-4 text-left transition-colors duration-150 hover:border-ink-3 hover:bg-surface disabled:opacity-40"
                            >
                                <span className="text-body font-bold text-ink">{option.label}</span>
                                <span className="text-body-sm text-ink-2">{option.hint}</span>
                            </button>
                        ))}
                    </fieldset>
                    {isSaving && (
                        <p role="status" className="text-body-sm text-ink-2">
                            기록을 저장하는 중…
                        </p>
                    )}
                </div>
            </main>
        )
    }

    const restRunning = isTimerActive
    const lastTenSeconds = restRunning && !isPaused && timeLeft <= 10

    const stations: StationData[] = blocks.map((block, bi) => {
        const doneCount = block.prescription.filter((_, si) => checkedSets.has(`${bi}-${si}`)).length
        const status = bi < currentBlockIndex ? "done" : bi === currentBlockIndex ? "current" : "upcoming"
        const weights = block.prescription.map((set) => set.targetWeightKg).filter((kg): kg is number => kg !== null)
        const weightRange =
            weights.length === 0 ? "맨몸" : Math.min(...weights) === Math.max(...weights) ? `${weights[0]}kg` : `${Math.min(...weights)}–${Math.max(...weights)}kg`

        if (status !== "current") {
            return {
                key: block.clientBlockId ?? `${block.exerciseId}-${bi}`,
                title: block.exerciseName,
                status,
                meta: status === "done" ? `${doneCount}세트 완료` : `${block.prescription.length}세트 · ${weightRange} · ${block.prescription[0]?.targetReps ?? 0}회`,
            }
        }

        const set = block.prescription[currentSetIndex]
        return {
            key: block.clientBlockId ?? `${block.exerciseId}-${bi}`,
            title: block.exerciseName,
            status,
            content: (
                <div ref={currentStationRef} className="flex scroll-mt-4 flex-col gap-4">
                    <p className="text-title-sm font-bold tabular-nums text-ink">
                        {restRunning ? "다음 " : ""}세트 {currentSetIndex + 1}
                        <span className="font-normal text-ink-2"> / {block.prescription.length}</span>
                    </p>
                    {restRunning ? (
                        <div aria-live="polite">
                            <p className="text-body-sm text-ink-2">{isPaused ? "휴식 일시정지" : "휴식"}</p>
                            <p
                                role="timer"
                                aria-label="남은 휴식 시간"
                                className={`text-display font-bold tabular-nums ${lastTenSeconds ? "text-danger" : isPaused ? "text-ink-2" : "text-ink"}`}
                            >
                                {formatTime(timeLeft)}
                            </p>
                            <p className="mt-2 flex items-baseline gap-1.5 tabular-nums text-ink">
                                <span className="text-body-sm text-ink-2">다음</span>
                                <span className="text-title font-bold">
                                    {weightText(set.targetWeightKg)}
                                    {set.targetWeightKg !== null ? "kg" : ""} × {set.targetReps}회
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="flex items-baseline gap-1.5 tabular-nums text-ink">
                                <span className="text-display font-bold">{weightText(set.targetWeightKg)}</span>
                                {set.targetWeightKg !== null && <span className="text-title-sm text-ink-2">kg</span>}
                                <span className="text-display font-bold">× {set.targetReps}</span>
                                <span className="text-title-sm text-ink-2">회</span>
                            </p>
                            <p className="mt-1 text-body-sm text-ink-2 tabular-nums">
                                여유 {set.targetRir}회 남기기 · 끝나면 휴식 {formatTime(set.targetRestSec)}
                            </p>
                        </div>
                    )}
                    <ol aria-label="세트" className="flex flex-wrap gap-2">
                        {block.prescription.map((s, si) => {
                            const done = checkedSets.has(`${bi}-${si}`)
                            const isNext = si === currentSetIndex
                            return (
                                <li key={si}>
                                    <button
                                        type="button"
                                        onClick={() => toggleSet(bi, si, s.targetRestSec)}
                                        aria-pressed={done}
                                        aria-label={`${si + 1}세트 ${weightText(s.targetWeightKg)}${s.targetWeightKg !== null ? "kg" : ""} ${s.targetReps}회 ${done ? "완료 취소" : "완료"}`}
                                        className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border-[3px] px-3 text-body-sm font-bold tabular-nums transition-colors duration-150"
                                        style={{
                                            borderColor: done || isNext ? ROUTE_LINE_COLOR_VAR[line] : "var(--color-rail)",
                                            background: done ? ROUTE_LINE_COLOR_VAR[line] : "var(--color-ground)",
                                            color: done ? "#fff" : "var(--color-ink)",
                                        }}
                                    >
                                        {done && <Check className="size-4" aria-hidden />}
                                        {si + 1}
                                    </button>
                                </li>
                            )
                        })}
                    </ol>
                    {block.exerciseRationale && (
                        <details className="group text-body-sm text-ink-2">
                            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-ink [&::-webkit-details-marker]:hidden">
                                이 운동을 고른 이유
                                <ChevronDown className="size-4 text-ink-2 transition-transform duration-150 group-open:rotate-180" aria-hidden />
                            </summary>
                            <p className="mt-1">{block.exerciseRationale}</p>
                        </details>
                    )}
                </div>
            ),
        }
    })


    return (
        <main className="absolute inset-0 flex flex-col overflow-hidden bg-ground">
            <header className="shrink-0 border-b border-hairline px-4 pb-3 pt-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setExitOpen(true)}
                        aria-label="운동 중단"
                        className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                    <LineBadge line={line} />
                    <h1 className="min-w-0 flex-1 truncate text-body font-bold text-ink">{routine.summaryTitle || "오늘의 루틴"}</h1>
                    <span className="shrink-0 text-body-sm text-ink-2 tabular-nums">
                        <span className="font-bold text-ink">{checkedSets.size}</span> / {totalSets} 세트
                    </span>
                </div>
                <div
                    className="mt-3 h-1 overflow-hidden rounded-full bg-hairline"
                    role="progressbar"
                    aria-label="전체 진행률"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                >
                    <div
                        className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                        style={{ width: `${progressPercent}%`, background: ROUTE_LINE_COLOR_VAR[line] }}
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5">
                <Route label={`${routine.summaryTitle || "오늘의 루틴"} 진행 노선`} line={line} mode="progress" stations={stations} />
            </div>

            <footer className="shrink-0 border-t border-hairline bg-ground px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {restRunning ? (
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={isPaused ? handleResume : handlePause}
                            icon={isPaused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
                        >
                            {isPaused ? "재개" : "일시정지"}
                        </Button>
                        <Button variant="primary" size="lg" block line={line} onClick={finishRest}>
                            휴식 끝내기
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" size="lg" block line={line} onClick={completeCurrentSet} disabled={!currentSet}>
                        {currentSet ? `세트 ${currentSetIndex + 1} 완료` : "완료"}
                    </Button>
                )}
            </footer>

            <Sheet
                open={exitOpen}
                onClose={() => setExitOpen(false)}
                title="운동을 멈출까요?"
                description="지금까지 완료한 세트는 이 기기에 남아서 나중에 이어서 할 수 있어요."
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={() => setExitOpen(false)}>
                            계속하기
                        </Button>
                        <Button variant="primary" size="lg" onClick={() => router.push("/my")}>
                            나가기
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2 tabular-nums">
                    {checkedSets.size} / {totalSets} 세트 완료
                </p>
            </Sheet>
        </main>
    )
}
