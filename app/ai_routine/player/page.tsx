"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Pause, Play, Volume2, VolumeX, X } from "lucide-react"
import { RoutineDraft } from "@/types/routine"
import workoutApiClient, { WorkoutSaveRequest } from "@/lib/api/workout/workoutApiClient"
import { redirectToLogin } from "@/lib/axios/AxiosController"
import { getKstToday } from "@/utils/date"
import { WorkoutState } from "@/types/state"
import { toast } from "sonner"
import type { ProgramPlayerContext } from "@/types/program"
import { readValidProgramContext } from "@/utils/programContext"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR } from "@/utils/routeLine"
import { useSettingsStore } from "@/store/settingsStore"
import { useAuthStore } from "@/store/authStore"
import { normalizeAccountId, readAccountOwner, readFailedSaveFor, workoutOwnershipFor, writeOwnedFailedSave } from "@/utils/accountScopedStorage"
import {
    ACTIVE_ROUTINE_KEY,
    type ActualSet,
    clearFailedSave,
    clearPlayerProgress,
    clearWorkoutStorage,
    httpStatusOf,
    parsePlayerProgress,
    PLAYER_PROGRESS_KEY,
    readFailedSave,
    ROUTINE_FINAL_ID_KEY,
    routineIdOf,
    SPLIT_LABEL_KEY,
    type RestTimerState,
    writePlayerProgress,
} from "@/utils/activeWorkout"
import {
    actualFor,
    adjustRest,
    buildSetsPayload,
    computeDurationMin,
    effortToRpe,
    formatWeight,
    restRemainingSec,
    setKey,
    toDisplayWeight,
    unitLabel,
} from "@/utils/workoutSets"
import { getCachedRecentRecord } from "@/utils/recentRecordCache"
import { playRestCue, primeRestCue } from "@/utils/restCue"
import type { RecentRecord } from "@/services/mockDataFactory"
import { Button, EmptyState, LineBadge, Notice, Route, Sheet, Skeleton, type StationData, TextAreaField } from "@/components/ui"
import { SetLogger } from "./SetLogger"
import { useWakeLock } from "./useWakeLock"
import { WorkoutSummaryScreen } from "./WorkoutSummaryScreen"
import { buildWorkoutSummary, type WorkoutSummary } from "@/utils/workoutSummary"
import type { PrResponse } from "@/types/project"

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
}

const REST_ADJUST_SEC = 30
/** The pre-save PR lookup never holds up the save longer than this. */
const PR_LOOKUP_WAIT_MS = 2500

const SESSION_NOTE_MAX = 1000

const EFFORT_OPTIONS = [
    { score: 1, label: "쉬웠어요", hint: "다음엔 볼륨을 늘려요" },
    { score: 2, label: "적당했어요", hint: "지금 강도를 유지해요" },
    { score: 3, label: "힘들었어요", hint: "다음엔 볼륨을 줄여요" },
]

function readJsonArray(key: string): string[] {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]")
        return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
    } catch {
        return []
    }
}

function readDoms(): Record<string, number> {
    try {
        const value = JSON.parse(localStorage.getItem("fitcore_doms_data") || "{}")
        return value && typeof value === "object" && !Array.isArray(value) ? value : {}
    } catch {
        return {}
    }
}

export default function WorkoutPlayer() {
    const router = useRouter()
    const weightUnit = useSettingsStore((s) => s.weightUnit)
    const restSoundMuted = useSettingsStore((s) => s.restSoundMuted)
    const setRestSoundMuted = useSettingsStore((s) => s.setRestSoundMuted)

    const [routine, setRoutine] = useState<RoutineDraft | null>(null)
    const [routineFinalId, setRoutineFinalId] = useState<string | null>(null)
    const [programContext, setProgramContext] = useState<ProgramPlayerContext | null>(null)
    const [checkedSets, setCheckedSets] = useState<Set<string>>(new Set())
    const [actuals, setActuals] = useState<Record<string, ActualSet>>({})
    const [startedAt, setStartedAt] = useState<number>(0)
    const [splitLabelCode, setSplitLabelCode] = useState<string | null>(null)

    const [rest, setRest] = useState<RestTimerState | null>(null)
    const [timeLeft, setTimeLeft] = useState(0)
    const [announcement, setAnnouncement] = useState("")
    const [exitOpen, setExitOpen] = useState(false)
    const [endOpen, setEndOpen] = useState(false)
    const [finishing, setFinishing] = useState(false)
    const [recentRecords, setRecentRecords] = useState<Record<string, RecentRecord | null>>({})

    const [workoutStatus, setWorkoutStatus] = useState<WorkoutState>("idle")
    const [failReason, setFailReason] = useState<"auth" | "network">("network")
    const pendingPayload = useRef<WorkoutSaveRequest | null>(null)
    const [sessionNote, setSessionNote] = useState("")
    const pendingProgramContext = useRef<ProgramPlayerContext | null>(null)
    /** Set once the user leaves or the workout is saved, so the persist effect stops writing. */
    const stopPersistingRef = useRef(false)
    const currentStationRef = useRef<HTMLDivElement | null>(null)
    /** PRs as they were before this workout (GET /api/workouts/prs); resolves to null on failure. */
    const priorPrsRef = useRef<Promise<PrResponse[] | null> | null>(null)
    const [summary, setSummary] = useState<WorkoutSummary | null>(null)
    const [doneHref, setDoneHref] = useState("/workout")

    const routineId = routine ? routineIdOf(routine, routineFinalId) : null

    useEffect(() => {
        const savedRoutine = localStorage.getItem(ACTIVE_ROUTINE_KEY)
        const savedFinalId = localStorage.getItem(ROUTINE_FINAL_ID_KEY)
        const savedProgramContext = readValidProgramContext(savedFinalId)
        setSplitLabelCode(localStorage.getItem(SPLIT_LABEL_KEY))
        if (!savedRoutine) {
            // A backup of an unsaved workout (e.g. back from "다시 로그인 후 저장"): the home card retries it.
            if (readFailedSaveFor(useAuthStore.getState().user?.email)) {
                toast("저장하지 못한 운동 기록이 있어요", { id: "player-failed-save", description: "홈에서 다시 저장할 수 있어요." })
                router.replace("/")
                return
            }
            toast.error("진행 중인 루틴이 없어요.")
            router.push("/ai_routine")
            return
        }
        // A workout taken over from an unknown owner (older app data) must be confirmed on the home card
        // before it can be continued and saved to this account.
        const accountId = useAuthStore.getState().user?.email
        if (readAccountOwner() !== null && workoutOwnershipFor(accountId) === "unconfirmed") {
            toast("이 기기에 있던 운동 기록이에요", { id: "player-unconfirmed-owner", description: "홈에서 내 기록이 맞는지 확인한 뒤 이어서 할 수 있어요." })
            router.replace("/")
            return
        }
        let parsedRoutine: RoutineDraft
        try {
            parsedRoutine = JSON.parse(savedRoutine) as RoutineDraft
            if (!Array.isArray(parsedRoutine?.routineBlocks)) throw new Error("routineBlocks missing")
        } catch {
            toast.error("루틴 데이터가 손상되었어요.")
            router.push("/ai_routine")
            return
        }
        const currentId = routineIdOf(parsedRoutine, savedFinalId)
        const now = Date.now()
        let restoredStart = now

        // Restore progress only when it belongs to this routine.
        const saved = parsePlayerProgress(localStorage.getItem(PLAYER_PROGRESS_KEY), now)
        if (saved && saved.routineId === currentId) {
            setActuals(saved.actuals)
            if (saved.checkedSets.length > 0) {
                setCheckedSets(new Set(saved.checkedSets))
                restoredStart = saved.startedAt
            }
            // A rest that ended while the page was closed ends silently.
            if (saved.rest && restRemainingSec(saved.rest, now) > 0) {
                setRest(saved.rest)
                setTimeLeft(restRemainingSec(saved.rest, now))
            }
        }
        setStartedAt(restoredStart)
        setRoutine(parsedRoutine)
        if (savedFinalId) setRoutineFinalId(savedFinalId)
        if (savedProgramContext) setProgramContext(savedProgramContext)

        // A failed save of this same workout reopens on the retry screen.
        const failed = readFailedSave()
        if (failed && failed.routineId !== null && failed.routineId === currentId) {
            pendingPayload.current = failed.payload
            pendingProgramContext.current = savedProgramContext
            // Reopened (e.g. after re-login): offer a plain retry; a new 401 switches back to the login prompt.
            setFailReason("network")
            setWorkoutStatus("saveFailed")
            return
        }
        setWorkoutStatus("inProgress")
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

    useWakeLock(workoutStatus === "inProgress" || workoutStatus === "saving")

    // Fetch the previous PRs once, before anything is saved, so the summary can spot new ones.
    useEffect(() => {
        if (priorPrsRef.current || (workoutStatus !== "inProgress" && workoutStatus !== "saveFailed")) return
        priorPrsRef.current = workoutApiClient.getPrs().then(
            (prs) => (Array.isArray(prs) ? prs : null),
            () => null,
        )
    }, [workoutStatus])

    const scrollToCurrent = useCallback(() => {
        setTimeout(() => currentStationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
    }, [])

    // Single exit point for rest: reaching zero (with cue), skip, and adjustments down to zero.
    const endRest = useCallback(
        (withCue: boolean) => {
            setRest(null)
            setTimeLeft(0)
            if (withCue) playRestCue({ muted: restSoundMuted })
            setAnnouncement("휴식이 끝났어요. 다음 세트를 시작하세요.")
            scrollToCurrent()
        },
        [restSoundMuted, scrollToCurrent],
    )

    useEffect(() => {
        if (!rest || rest.pausedAt !== null) return
        const tick = () => {
            const remaining = restRemainingSec(rest)
            setTimeLeft(remaining)
            if (remaining === 0) endRest(true)
        }
        tick()
        const id = setInterval(tick, 500)
        // Background tabs throttle intervals; recompute as soon as the page is visible again.
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") tick()
        }
        document.addEventListener("visibilitychange", onVisibilityChange)
        return () => {
            clearInterval(id)
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
    }, [rest, endRest])

    useEffect(() => {
        if (!routine || workoutStatus !== "inProgress" || !routineId || stopPersistingRef.current) return
        writePlayerProgress({ routineId, checkedSets: [...checkedSets], actuals, startedAt, rest })
    }, [checkedSets, actuals, startedAt, rest, routine, routineId, workoutStatus])

    const line = useMemo(
        () => lineForRoutine(splitLabelCode, routine?.routineBlocks.flatMap((block) => block.primaryMuscles ?? []) ?? []),
        [splitLabelCode, routine],
    )

    const blocks = useMemo(() => routine?.routineBlocks ?? [], [routine])
    const currentBlockIndex = blocks.findIndex((block, bi) => block.prescription.some((_, si) => !checkedSets.has(setKey(bi, si))))
    const currentExerciseId = currentBlockIndex >= 0 ? blocks[currentBlockIndex].exerciseId : null

    useEffect(() => {
        if (!currentExerciseId || currentExerciseId in recentRecords) return
        let cancelled = false
        getCachedRecentRecord(currentExerciseId).then((record) => {
            if (!cancelled) setRecentRecords((prev) => ({ ...prev, [currentExerciseId]: record }))
        })
        return () => {
            cancelled = true
        }
    }, [currentExerciseId, recentRecords])

    const leavePlayer = () => {
        stopPersistingRef.current = true
        if (typeof window !== "undefined" && window.history.length > 1) router.back()
        else router.push("/workout")
    }

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

    const totalSets = blocks.reduce((acc, block) => acc + block.prescription.length, 0)
    const doneCount = checkedSets.size
    const allSetsComplete = totalSets > 0 && doneCount >= totalSets
    const progressPercent = totalSets === 0 ? 0 : Math.round((doneCount / totalSets) * 100)
    const isSaving = workoutStatus === "saving"
    const u = unitLabel(weightUnit)

    const currentSetIndex =
        currentBlockIndex < 0 ? -1 : blocks[currentBlockIndex].prescription.findIndex((_, si) => !checkedSets.has(setKey(currentBlockIndex, si)))
    const currentSet = currentBlockIndex < 0 ? null : blocks[currentBlockIndex].prescription[currentSetIndex]

    const startRest = (restSec: number) => {
        const sec = Math.max(0, Math.round(restSec))
        if (sec === 0) {
            setRest(null)
            return
        }
        setRest({ endsAt: Date.now() + sec * 1000, pausedAt: null })
        setTimeLeft(sec)
        setAnnouncement(`휴식 ${formatTime(sec)} 시작`)
    }

    const toggleSet = (blockIndex: number, setArrayIndex: number, restSec: number) => {
        const key = setKey(blockIndex, setArrayIndex)
        const next = new Set(checkedSets)
        if (next.has(key)) {
            next.delete(key)
            setCheckedSets(next)
            return
        }
        primeRestCue()
        const block = blocks[blockIndex]
        const actual = actualFor(actuals, block, blockIndex, setArrayIndex)
        const nextActuals = { ...actuals, [key]: actual }
        // Carry an adjusted weight forward to later untouched sets that had the same target.
        const target = block.prescription[setArrayIndex]?.targetWeightKg ?? null
        block.prescription.forEach((set, si) => {
            const laterKey = setKey(blockIndex, si)
            if (si <= setArrayIndex || next.has(laterKey) || nextActuals[laterKey]) return
            if ((set.targetWeightKg ?? null) === target && actual.weightKg !== target) {
                nextActuals[laterKey] = { weightKg: actual.weightKg, reps: actualFor({}, block, blockIndex, si).reps }
            }
        })
        next.add(key)
        setActuals(nextActuals)
        setCheckedSets(next)
        if (next.size >= totalSets) {
            setRest(null)
            return
        }
        startRest(restSec)
        scrollToCurrent()
    }

    const completeCurrentSet = () => {
        if (!currentSet) return
        toggleSet(currentBlockIndex, currentSetIndex, currentSet.targetRestSec)
    }

    const handlePause = () => {
        if (rest && rest.pausedAt === null) setRest({ ...rest, pausedAt: Date.now() })
    }

    const handleResume = () => {
        if (!rest || rest.pausedAt === null) return
        setRest({ endsAt: rest.endsAt + (Date.now() - rest.pausedAt), pausedAt: null })
    }

    const handleAdjustRest = (deltaSec: number) => {
        if (!rest) return
        const next = adjustRest(rest, deltaSec)
        const remaining = restRemainingSec(next)
        if (remaining === 0) {
            endRest(false)
            return
        }
        setRest(next)
        setTimeLeft(remaining)
    }

    const handleFinishRPE = async (effortScore: number) => {
        if (doneCount === 0) return
        setWorkoutStatus("saving")
        setRest(null)

        const DOMS_LEVEL_MAP: Record<number, string> = { 1: "mild", 2: "moderate", 3: "severe" }
        const currentDoms = Object.entries(readDoms())
            .filter(([, v]) => DOMS_LEVEL_MAP[v] !== undefined)
            .map(([bodyPart, v]) => ({ bodyPart, level: DOMS_LEVEL_MAP[v] }))

        const sets = buildSetsPayload(blocks, checkedSets, actuals, effortToRpe(effortScore))
        const routineTitle = routine.summaryTitle || splitLabelCode || "오늘의 루틴"

        // Partial (ended-early) saves keep the program link: the user chose to finish this session.
        const validProgramContext = readValidProgramContext(routineFinalId)
        setProgramContext(validProgramContext)
        if (programContext && !validProgramContext) {
            toast.error("프로그램 정보가 현재 루틴과 맞지 않아 일반 운동으로 저장해요.")
        }

        const finalWorkoutData: WorkoutSaveRequest = {
            workoutDate: getKstToday(),
            splitLabel: routineTitle,
            sourceRoutineFinalId: validProgramContext?.routineFinalId ?? routineFinalId,
            ...(validProgramContext
                ? { programId: validProgramContext.programId, programItemId: validProgramContext.programItemId }
                : {}),
            timeAvailableMin: routine.totalEstimatedTime,
            durationMin: computeDurationMin(startedAt || Date.now()),
            readinessLevel: "normal",
            currentPainAreas: readJsonArray("fitcore_pain_areas"),
            currentDoms,
            unavailableEquipment: readJsonArray("fitcore_unavailable_equipment"),
            ...(sessionNote.trim() ? { sessionNote: sessionNote.trim().slice(0, SESSION_NOTE_MAX) } : {}),
            sets,
        }

        pendingPayload.current = finalWorkoutData
        pendingProgramContext.current = validProgramContext
        await trySave(finalWorkoutData, validProgramContext)
    }

    const trySave = async (payload: WorkoutSaveRequest, contextSnapshot: ProgramPlayerContext | null = pendingProgramContext.current) => {
        setWorkoutStatus("saving")
        // Written before the request: a 401 makes the axios interceptor navigate to /login immediately.
        // The backup carries the account that did the workout, read once here (auth state may change after a 401).
        const ownerSub = normalizeAccountId(useAuthStore.getState().user?.email) ?? readAccountOwner()
        const failedEntry = {
            payload,
            routineId,
            programId: contextSnapshot?.programId ?? null,
            failedAt: Date.now(),
        }
        // Don't clobber an older, unrelated failed save unless this one actually fails.
        const existing = readFailedSave()
        const ownsSlot = !existing || existing.routineId === routineId
        if (ownsSlot) writeOwnedFailedSave({ ...failedEntry, reason: "network" }, ownerSub)
        // Wait briefly for the previous PRs; a slow or failed lookup only hides the PR section.
        const priorPrsPromise = priorPrsRef.current ?? Promise.resolve(null)
        const priorPrs = await Promise.race([
            priorPrsPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), PR_LOOKUP_WAIT_MS)),
        ])
        try {
            await workoutApiClient.save(payload)
            const redirectToProgram = contextSnapshot?.programId
            stopPersistingRef.current = true
            clearWorkoutStorage()
            if (ownsSlot) clearFailedSave()
            pendingProgramContext.current = null
            setProgramContext(null)
            setDoneHref(redirectToProgram ? `/workout/programs/${redirectToProgram}` : "/workout")
            setSummary(buildWorkoutSummary(payload, priorPrs))
            setWorkoutStatus("saved")
        } catch (err) {
            console.error("[player] POST /api/workouts failed:", err)
            const reason = httpStatusOf(err) === 401 ? "auth" : "network"
            writeOwnedFailedSave({ ...failedEntry, reason }, ownerSub)
            setFailReason(reason)
            setWorkoutStatus("saveFailed")
        }
    }

    const handleRetry = () => {
        if (pendingPayload.current) trySave(pendingPayload.current, pendingProgramContext.current)
    }

    const handleLoginToSave = () => {
        // The payload stays in storage (owned by this account); the home card offers the retry after login,
        // matching the copy on this screen.
        stopPersistingRef.current = true
        redirectToLogin("/")
    }

    const handleDiscardWorkout = () => {
        stopPersistingRef.current = true
        clearWorkoutStorage()
        if (readFailedSave()?.routineId === routineId) clearFailedSave()
        router.push("/workout")
    }

    /** Throws away this attempt's progress but keeps the routine, so going back still finds it. */
    const handleLeaveWithoutSaving = () => {
        stopPersistingRef.current = true
        clearPlayerProgress()
        leavePlayer()
    }

    if (workoutStatus === "saved" && summary) {
        return (
            <WorkoutSummaryScreen
                summary={summary}
                title={pendingPayload.current?.splitLabel || routine.summaryTitle || "오늘의 루틴"}
                line={line}
                weightUnit={weightUnit}
                doneLabel={doneHref === "/workout" ? "운동 탭으로" : "프로그램으로"}
                onDone={() => router.replace(doneHref)}
            />
        )
    }

    if (workoutStatus === "saveFailed") {
        const isAuth = failReason === "auth"
        return (
            <main className="absolute inset-0 flex flex-col justify-center gap-6 bg-ground p-6">
                <div>
                    <h1 className="text-headline font-bold text-ink">기록을 저장하지 못했어요</h1>
                    <p className="mt-2 text-body text-ink-2">
                        {isAuth
                            ? "로그인이 만료됐어요. 다시 로그인하면 홈에서 이번 기록을 그대로 저장할 수 있어요."
                            : "네트워크 문제로 저장이 실패했어요. 다시 시도하면 지금 기록이 그대로 저장돼요."}
                    </p>
                </div>
                <Notice tone="danger">저장하지 않고 나가면 이번 운동 기록은 남지 않아요.</Notice>
                <div className="flex flex-col gap-2">
                    {isAuth ? (
                        <Button variant="primary" size="lg" block line={line} onClick={handleLoginToSave}>
                            다시 로그인 후 저장
                        </Button>
                    ) : (
                        <Button variant="primary" size="lg" block line={line} loading={isSaving} onClick={handleRetry}>
                            다시 저장
                        </Button>
                    )}
                    <Button variant="ghost" size="lg" block disabled={isSaving} onClick={handleDiscardWorkout}>
                        저장하지 않고 나가기
                    </Button>
                </div>
            </main>
        )
    }

    if (totalSets === 0) {
        return (
            <main className="absolute inset-0 flex flex-col justify-center bg-ground p-6">
                <EmptyState
                    title="이 루틴에는 진행할 세트가 없어요"
                    body="루틴을 다시 고르거나 편집해서 세트를 추가하세요."
                    action={
                        <div className="flex flex-col gap-2">
                            <Button variant="primary" size="lg" block onClick={() => router.push("/workout")}>
                                운동 탭으로
                            </Button>
                            <Button variant="ghost" size="lg" block onClick={leavePlayer}>
                                이전 화면으로
                            </Button>
                        </div>
                    }
                />
            </main>
        )
    }

    if (allSetsComplete || finishing) {
        return (
            <main className="absolute inset-0 flex flex-col bg-ground">
                <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto p-6">
                    <div>
                        <LineBadge line={line} />
                        <h1 className="mt-3 text-headline font-bold text-ink">{allSetsComplete ? "종점 도착" : "여기서 하차"}</h1>
                        <p className="mt-1 text-body text-ink-2 tabular-nums">
                            {allSetsComplete
                                ? `${blocks.length}개 운동 · ${totalSets}세트를 모두 마쳤어요.`
                                : `${totalSets}세트 중 ${doneCount}세트를 마쳤어요. 완료한 세트만 기록돼요.`}
                        </p>
                    </div>
                    <TextAreaField
                        label="메모"
                        optional
                        rows={2}
                        maxLength={SESSION_NOTE_MAX}
                        value={sessionNote}
                        onChange={(e) => setSessionNote(e.target.value)}
                        disabled={isSaving}
                        placeholder="예: 어깨 컨디션 좋음, 다음엔 스쿼트 증량"
                    />
                    <fieldset className="flex flex-col gap-2" disabled={isSaving}>
                        <legend className="text-title-sm font-bold text-ink">오늘 강도는 어땠나요?</legend>
                        <p className="mb-2 text-body-sm text-ink-2">고르면 바로 기록이 저장돼요.</p>
                        {EFFORT_OPTIONS.map((option) => (
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
                    {!allSetsComplete && (
                        <Button variant="ghost" size="lg" block disabled={isSaving} onClick={() => setFinishing(false)}>
                            운동 계속하기
                        </Button>
                    )}
                </div>
            </main>
        )
    }

    const restRunning = rest !== null
    const isPaused = rest?.pausedAt != null
    const lastTenSeconds = restRunning && !isPaused && timeLeft <= 10

    const stations: StationData[] = blocks.map((block, bi) => {
        const blockDone = block.prescription.filter((_, si) => checkedSets.has(setKey(bi, si))).length
        const status = bi < currentBlockIndex ? "done" : bi === currentBlockIndex ? "current" : "upcoming"
        const weights = block.prescription.map((set) => set.targetWeightKg).filter((kg): kg is number => kg !== null && kg > 0)
        const minW = Math.min(...weights)
        const maxW = Math.max(...weights)
        const weightRange =
            weights.length === 0
                ? "맨몸"
                : minW === maxW
                  ? formatWeight(minW, weightUnit)
                  : `${toDisplayWeight(minW, weightUnit)}–${toDisplayWeight(maxW, weightUnit)}${u}`

        if (status !== "current") {
            return {
                key: block.clientBlockId ?? `${block.exerciseId}-${bi}`,
                title: block.exerciseName,
                status,
                meta:
                    status === "done"
                        ? `${blockDone}세트 완료`
                        : `${block.prescription.length}세트 · ${weightRange} · ${block.prescription[0]?.targetReps ?? 0}회`,
            }
        }

        const set = block.prescription[currentSetIndex]
        const actual = actualFor(actuals, block, bi, currentSetIndex)
        const record = recentRecords[block.exerciseId]
        const setActual = (next: ActualSet) => setActuals((prev) => ({ ...prev, [setKey(bi, currentSetIndex)]: next }))

        return {
            key: block.clientBlockId ?? `${block.exerciseId}-${bi}`,
            title: block.exerciseName,
            status,
            content: (
                <div ref={currentStationRef} className="flex scroll-mt-4 flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-title-sm font-bold tabular-nums text-ink">
                            {restRunning ? "다음 " : ""}세트 {currentSetIndex + 1}
                            <span className="font-normal text-ink-2"> / {block.prescription.length}</span>
                        </p>
                        {record && (
                            <p className="text-body-sm text-ink-2 tabular-nums">
                                지난번 {formatWeight(record.defaultWeight, weightUnit)} × {record.defaultReps}
                            </p>
                        )}
                    </div>
                    {restRunning ? (
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-body-sm text-ink-2">{isPaused ? "휴식 일시정지" : "휴식"}</p>
                                <button
                                    type="button"
                                    onClick={() => setRestSoundMuted(!restSoundMuted)}
                                    aria-pressed={!restSoundMuted}
                                    aria-label="휴식 끝 알림음"
                                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                                >
                                    {restSoundMuted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
                                </button>
                            </div>
                            <p
                                role="timer"
                                aria-label="남은 휴식 시간"
                                className={`text-display font-bold tabular-nums ${lastTenSeconds ? "text-danger" : isPaused ? "text-ink-2" : "text-ink"}`}
                            >
                                {formatTime(timeLeft)}
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Button variant="secondary" size="lg" onClick={() => handleAdjustRest(-REST_ADJUST_SEC)}>
                                    −30초
                                </Button>
                                <Button variant="secondary" size="lg" onClick={() => handleAdjustRest(REST_ADJUST_SEC)}>
                                    +30초
                                </Button>
                            </div>
                            <p className="mt-3 flex items-baseline gap-1.5 tabular-nums text-ink">
                                <span className="text-body-sm text-ink-2">다음</span>
                                <span className="text-title font-bold">
                                    {formatWeight(actual.weightKg, weightUnit)} × {actual.reps}회
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <SetLogger actual={actual} unit={weightUnit} line={line} onChange={setActual} />
                            <p className="text-body-sm text-ink-2 tabular-nums">
                                목표 {formatWeight(set.targetWeightKg, weightUnit)} × {set.targetReps}회 · 여유 {set.targetRir}회 남기기 · 끝나면 휴식{" "}
                                {formatTime(set.targetRestSec)}
                            </p>
                        </div>
                    )}
                    <ol aria-label="세트" className="flex flex-wrap gap-2">
                        {block.prescription.map((s, si) => {
                            const done = checkedSets.has(setKey(bi, si))
                            const isNext = si === currentSetIndex
                            const chipActual = actualFor(actuals, block, bi, si)
                            return (
                                <li key={si}>
                                    <button
                                        type="button"
                                        onClick={() => toggleSet(bi, si, s.targetRestSec)}
                                        aria-pressed={done}
                                        aria-label={`${si + 1}세트 ${formatWeight(chipActual.weightKg, weightUnit)} ${chipActual.reps}회 ${done ? "완료 취소" : "완료"}`}
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

    const currentActual = currentSet ? actualFor(actuals, blocks[currentBlockIndex], currentBlockIndex, currentSetIndex) : null

    return (
        <main className="absolute inset-0 flex flex-col overflow-hidden bg-ground">
            <p role="status" aria-live="polite" className="sr-only">
                {announcement}
            </p>
            <header className="shrink-0 border-b border-hairline px-4 pb-3 pt-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setExitOpen(true)}
                        aria-label="운동 나가기"
                        className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                    <LineBadge line={line} />
                    <h1 className="min-w-0 flex-1 truncate text-body font-bold text-ink">{routine.summaryTitle || "오늘의 루틴"}</h1>
                    <span className="shrink-0 text-body-sm text-ink-2 tabular-nums">
                        <span className="font-bold text-ink">{doneCount}</span> / {totalSets}
                        <span className="sr-only"> 세트 완료</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => setEndOpen(true)}
                        className="-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-control px-2.5 text-body-sm font-bold text-ink hover:bg-surface"
                    >
                        운동 종료
                    </button>
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
                        <Button variant="primary" size="lg" block line={line} onClick={() => endRest(false)}>
                            휴식 끝내기
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" size="lg" block line={line} onClick={completeCurrentSet} disabled={!currentSet}>
                        {currentSet && currentActual
                            ? `세트 ${currentSetIndex + 1} 완료 · ${formatWeight(currentActual.weightKg, weightUnit)} × ${currentActual.reps}`
                            : "완료"}
                    </Button>
                )}
            </footer>

            <Sheet
                open={exitOpen}
                onClose={() => setExitOpen(false)}
                title="운동을 멈출까요?"
                description="완료한 세트를 지금 저장하거나, 이 기기에 남겨 두고 나중에 이어서 할 수 있어요."
                footer={
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="primary"
                            size="lg"
                            block
                            line={line}
                            disabled={doneCount === 0}
                            onClick={() => {
                                setExitOpen(false)
                                setRest(null)
                                setFinishing(true)
                            }}
                        >
                            저장하고 종료
                        </Button>
                        <Button variant="secondary" size="lg" block onClick={leavePlayer}>
                            나중에 이어서 하기
                        </Button>
                        <Button variant="danger-ghost" size="lg" block onClick={handleLeaveWithoutSaving}>
                            저장하지 않고 나가기
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2 tabular-nums">
                    {doneCount} / {totalSets} 세트 완료
                    {doneCount === 0 ? " · 저장할 세트가 아직 없어요" : ""}
                </p>
            </Sheet>

            <Sheet
                open={endOpen}
                onClose={() => setEndOpen(false)}
                title="운동을 끝낼까요?"
                description={
                    doneCount > 0
                        ? `완료한 ${doneCount}세트만 기록돼요. 남은 ${totalSets - doneCount}세트는 기록되지 않아요.`
                        : "아직 완료한 세트가 없어 저장할 기록이 없어요."
                }
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={() => setEndOpen(false)}>
                            계속하기
                        </Button>
                        {doneCount > 0 ? (
                            <Button
                                variant="primary"
                                size="lg"
                                line={line}
                                onClick={() => {
                                    setEndOpen(false)
                                    setRest(null)
                                    setFinishing(true)
                                }}
                            >
                                종료하고 저장
                            </Button>
                        ) : (
                            <Button variant="danger" size="lg" onClick={handleLeaveWithoutSaving}>
                                나가기
                            </Button>
                        )}
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2 tabular-nums">
                    {doneCount} / {totalSets} 세트 완료
                </p>
            </Sheet>
        </main>
    )
}
