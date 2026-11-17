"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, PenLine, Play, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import workoutApiClient from "@/lib/api/workout/workoutApiClient"
import { redirectToLogin } from "@/lib/axios/AxiosController"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { clearProgramContext } from "@/utils/programContext"
import type { WorkoutSessionResponse } from "@/types/project"
import type { RoutineFinalResponse } from "@/types/routine"
import { getKstToday } from "@/utils/date"
import { splitTitle } from "@/utils/displayLabels"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR } from "@/utils/routeLine"
import { PLAYER_PATH, prepareFinalRoutineForPlay } from "@/utils/routinePlay"
import { useAuthStore } from "@/store/authStore"
import {
    confirmFailedSaveOwnership,
    confirmWorkoutOwnership,
    readFailedSaveOffer,
    workoutOwnershipFor,
} from "@/utils/accountScopedStorage"
import {
    clearFailedSave,
    clearWorkoutStorage,
    type FailedWorkoutSave,
    httpStatusOf,
    needsOverwriteConfirm,
    OVERWRITE_CONFIRM_COPY,
    readUnfinishedWorkout,
    type UnfinishedWorkout,
    writeActiveRoutine,
} from "@/utils/activeWorkout"
import { Button, ButtonLink, LineBadge, Notice, RouteStrip, Section, Sheet, Skeleton, Surface, Tag } from "@/components/ui"

/** Asked before offering device data with no known owner (legacy backup or adopted workout). */
const OWNERSHIP_QUESTION_TITLE = "이 기기에 저장되지 않은 운동 기록이 있어요"
const OWNERSHIP_QUESTION = "내 기록이 맞나요?"

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
const MAX_STOPS = 5

function getWorkoutTitle(session: WorkoutSessionResponse): string {
    return (
        session.routineName?.trim() ||
        session.title?.trim() ||
        session.summaryTitle?.trim() ||
        splitTitle(session.splitLabel) ||
        splitTitle(session.targetSplitLabel) ||
        "운동 세션"
    )
}

/** Station names for a route strip: at most MAX_STOPS, the overflow folded into the last stop. */
function toStops(names: string[]): string[] {
    return names.length > MAX_STOPS ? [...names.slice(0, MAX_STOPS - 1), `외 ${names.length - MAX_STOPS + 1}개`] : names
}

function sessionStops(session: WorkoutSessionResponse): string[] {
    const ordered = [...(session.sets ?? [])].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    return toStops([...new Set(ordered.map((set) => set.exerciseNameSnapshot).filter(Boolean))])
}

const GUIDE_STOPS = ["컨디션 체크", "루틴 만들기", "출발"]

/** Monday-first dates (YYYY-MM-DD) of the week containing `today`. */
function weekDates(today: string): string[] {
    const base = new Date(`${today}T00:00:00Z`)
    const offset = (base.getUTCDay() + 6) % 7
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base)
        d.setUTCDate(base.getUTCDate() - offset + i)
        return d.toISOString().slice(0, 10)
    })
}

export default function TodayWorkoutCard() {
    const router = useRouter()
    const today = getKstToday()
    const accountId = useAuthStore((s) => s.user?.email)

    const [isLoading, setIsLoading] = useState(true)
    const [sessions, setSessions] = useState<WorkoutSessionResponse[]>([])
    const [latestRoutine, setLatestRoutine] = useState<RoutineFinalResponse | null>(null)
    const [hasError, setHasError] = useState(false)
    const [isCreatingManualRoutine, setIsCreatingManualRoutine] = useState(false)
    const [optionsOpen, setOptionsOpen] = useState(false)
    const [unfinished, setUnfinished] = useState<UnfinishedWorkout | null>(null)
    const [unfinishedNeedsConfirm, setUnfinishedNeedsConfirm] = useState(false)
    const [failedSave, setFailedSave] = useState<FailedWorkoutSave | null>(null)
    const [failedNeedsConfirm, setFailedNeedsConfirm] = useState(false)
    const [isRetryingSave, setIsRetryingSave] = useState(false)
    const [discardFailedOpen, setDiscardFailedOpen] = useState(false)
    /** A start action waiting for the user to confirm replacing the unfinished workout. */
    const [pendingStart, setPendingStart] = useState<(() => void) | null>(null)

    const loadSessions = useCallback(() => workoutApiClient.getRecent(0, 14).then((page) => setSessions(page.content ?? [])), [])

    useEffect(() => {
        // home is public: only the account that owns the in-progress workout may see/resume it.
        // Data with no known owner is shown with a "내 기록이 맞나요?" confirmation first.
        const ownership = workoutOwnershipFor(accountId)
        setUnfinished(ownership === "other" ? null : readUnfinishedWorkout())
        setUnfinishedNeedsConfirm(ownership === "unconfirmed")
    }, [accountId])

    // The failed-save backup is offered only to the account embedded in it; a legacy backup asks first.
    useEffect(() => {
        const offer = readFailedSaveOffer(accountId)
        setFailedSave(offer?.entry ?? null)
        setFailedNeedsConfirm(offer?.needsConfirm ?? false)
    }, [accountId])

    useEffect(() => {
        Promise.all([
            loadSessions(),
            routineApiClient
                .getMyFinals(0, 1)
                .then((page) => setLatestRoutine(page.content?.[0] ?? null))
                .catch(() => setLatestRoutine(null)),
        ])
            .catch(() => setHasError(true))
            .finally(() => setIsLoading(false))
    }, [loadSessions])

    const todaySessions = useMemo(() => sessions.filter((s) => String(s.workoutDate).slice(0, 10) === today), [sessions, today])
    const totalDurationMin = todaySessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
    const week = useMemo(() => weekDates(today), [today])

    /** Runs a start action now, or after confirmation when it would replace an unfinished workout. */
    const guardStart = (action: () => void) => {
        if (needsOverwriteConfirm()) setPendingStart(() => action)
        else action()
    }

    const handleCreateManualRoutine = async () => {
        if (isCreatingManualRoutine) return
        setIsCreatingManualRoutine(true)
        clearProgramContext()
        try {
            const draft = await routineApiClient.createManualDraft("새 루틴")
            writeActiveRoutine(draft, { finalId: null })
            router.push("/routine/draft?mode=manual")
        } catch {
            toast.error("루틴을 만들지 못했어요.")
        } finally {
            setIsCreatingManualRoutine(false)
        }
    }

    /** True when the failed payload came from the unfinished workout stored on this device. */
    const failedSaveMatchesUnfinished = (entry: FailedWorkoutSave | null) => {
        const current = readUnfinishedWorkout()
        return Boolean(current && entry?.routineId && current.routineId === entry.routineId)
    }

    const handleRetryFailedSave = async () => {
        if (!failedSave || isRetryingSave) return
        setIsRetryingSave(true)
        try {
            await workoutApiClient.save(failedSave.payload)
            if (failedSaveMatchesUnfinished(failedSave)) {
                clearWorkoutStorage()
                setUnfinished(null)
            }
            clearFailedSave()
            setFailedSave(null)
            toast.success("지난 운동 기록을 저장했어요.")
            if (failedSave.programId) {
                router.push(`/workout/programs/${failedSave.programId}`)
                return
            }
            loadSessions().catch(() => {})
        } catch (err) {
            // The payload stays in storage either way; after re-login this card offers the retry again.
            if (httpStatusOf(err) === 401) {
                toast.error("로그인이 만료됐어요. 다시 로그인하면 이 기록을 저장할 수 있어요.")
                redirectToLogin("/")
            } else {
                toast.error("아직 저장하지 못했어요. 잠시 뒤 다시 시도하세요.")
            }
        } finally {
            setIsRetryingSave(false)
        }
    }

    /** "내 기록이 맞아요" on a legacy backup: stamp this account into it, then save. */
    const handleConfirmFailedSave = () => {
        confirmFailedSaveOwnership(accountId)
        if (failedSaveMatchesUnfinished(failedSave)) {
            confirmWorkoutOwnership(accountId)
            setUnfinishedNeedsConfirm(false)
        }
        setFailedNeedsConfirm(false)
        handleRetryFailedSave()
    }

    /** "내 기록이 아니에요": hide it on this screen without saving or deleting it. */
    const handleRejectFailedSave = () => {
        if (failedSaveMatchesUnfinished(failedSave)) setUnfinished(null)
        setFailedSave(null)
        setFailedNeedsConfirm(false)
    }

    const handleConfirmUnfinished = () => {
        confirmWorkoutOwnership(accountId)
        setUnfinishedNeedsConfirm(false)
        router.push(PLAYER_PATH)
    }

    const handleDiscardFailedSave = () => {
        if (failedSaveMatchesUnfinished(failedSave)) {
            clearWorkoutStorage()
            setUnfinished(null)
        }
        clearFailedSave()
        setFailedSave(null)
        setDiscardFailedOpen(false)
    }

    const createButtons = (
        <div className="grid grid-cols-2 gap-2">
            <Button
                variant="secondary"
                loading={isCreatingManualRoutine}
                icon={<PenLine className="size-4" aria-hidden />}
                onClick={() => {
                    setOptionsOpen(false)
                    guardStart(handleCreateManualRoutine)
                }}
            >
                직접 만들기
            </Button>
            <Button
                variant="primary"
                icon={<Dumbbell className="size-4" aria-hidden />}
                onClick={() => {
                    setOptionsOpen(false)
                    router.push("/ai_routine")
                }}
            >
                AI 루틴 만들기
            </Button>
        </div>
    )

    const renderRecovery = () => {
        if (!failedSave) return null
        const details = `${failedSave.payload.splitLabel || "운동"} · ${String(failedSave.payload.workoutDate).slice(0, 10)} · ${failedSave.payload.sets.length}세트`
        if (failedNeedsConfirm) {
            return (
                <Surface tone="sunken" className="flex flex-col gap-3" role="region" aria-label="저장하지 못한 운동 기록">
                    <div>
                        <p className="text-title-sm font-bold text-ink">{OWNERSHIP_QUESTION_TITLE}</p>
                        <p className="mt-0.5 text-body text-ink">{OWNERSHIP_QUESTION}</p>
                        <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">{details}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" disabled={isRetryingSave} onClick={handleRejectFailedSave}>
                            내 기록이 아니에요
                        </Button>
                        <Button variant="primary" size="lg" loading={isRetryingSave} onClick={handleConfirmFailedSave}>
                            맞아요, 저장
                        </Button>
                    </div>
                </Surface>
            )
        }
        return (
            <Surface tone="sunken" className="flex flex-col gap-3" role="region" aria-label="저장하지 못한 운동 기록">
                <div>
                    <p className="text-title-sm font-bold text-ink">저장하지 못한 운동 기록이 있어요</p>
                    <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">{details}</p>
                    {failedSave.reason === "auth" && (
                        <p className="mt-1 text-body-sm text-ink-2">로그인이 만료돼서 저장하지 못했어요. 이제 다시 저장할 수 있어요.</p>
                    )}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Button
                        variant="primary"
                        size="lg"
                        block
                        loading={isRetryingSave}
                        icon={<RotateCcw className="size-4" aria-hidden />}
                        onClick={handleRetryFailedSave}
                    >
                        다시 저장
                    </Button>
                    <Button variant="ghost" size="lg" disabled={isRetryingSave} onClick={() => setDiscardFailedOpen(true)}>
                        버리기
                    </Button>
                </div>
            </Surface>
        )
    }

    const renderResume = () => {
        if (!unfinished) return null
        // The recovery card already covers a workout whose save failed.
        if (failedSave?.routineId && failedSave.routineId === unfinished.routineId) return null
        const line = lineForRoutine(null, unfinished.routine.routineBlocks.flatMap((b) => b.primaryMuscles ?? []))
        if (unfinishedNeedsConfirm) {
            return (
                <Surface tone="sunken" className="flex flex-col gap-3" role="region" aria-label="진행 중인 운동">
                    <div>
                        <p className="text-title-sm font-bold text-ink">{OWNERSHIP_QUESTION_TITLE}</p>
                        <p className="mt-0.5 text-body text-ink">{OWNERSHIP_QUESTION}</p>
                        <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                            {unfinished.title} · {unfinished.doneSets} / {unfinished.totalSets} 세트 완료
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={() => setUnfinished(null)}>
                            내 기록이 아니에요
                        </Button>
                        <Button variant="primary" size="lg" line={line} icon={<Play className="size-4" aria-hidden />} onClick={handleConfirmUnfinished}>
                            맞아요, 이어서
                        </Button>
                    </div>
                </Surface>
            )
        }
        return (
            <Surface tone="sunken" className="flex flex-col gap-3" role="region" aria-label="진행 중인 운동">
                <div>
                    <LineBadge line={line} />
                    <p className="mt-1.5 text-title-sm font-bold text-ink">{unfinished.title}</p>
                    <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                        진행 중 · {unfinished.doneSets} / {unfinished.totalSets} 세트 완료
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="lg"
                    block
                    line={line}
                    icon={<Play className="size-4" aria-hidden />}
                    onClick={() => router.push(PLAYER_PATH)}
                >
                    이어서 하기
                </Button>
            </Surface>
        )
    }

    const renderToday = () => {
        if (isLoading) {
            return (
                <Surface tone="sunken" className="flex flex-col gap-3" aria-busy="true">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-12 w-full" />
                </Surface>
            )
        }
        if (hasError) {
            return (
                <Notice tone="danger" title="오늘 운동 정보를 불러오지 못했어요">
                    잠시 뒤 다시 열거나 운동 탭에서 확인하세요.
                </Notice>
            )
        }
        if (todaySessions.length > 0) {
            const last = todaySessions[0]
            const line = lineForRoutine(last.targetSplitLabel ?? last.splitLabel)
            const title = todaySessions.length === 1 ? getWorkoutTitle(last) : `오늘 ${todaySessions.length}회 운동`
            const stops = sessionStops(last)
            return (
                <Surface tone="sunken" className="flex flex-col gap-4">
                    <div>
                        <p className="text-title-sm font-bold text-ink">{title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <LineBadge line={line} />
                            <Tag className="bg-ground">종점 도착</Tag>
                            {totalDurationMin > 0 && <span className="text-body-sm text-ink-2 tabular-nums">총 {totalDurationMin}분</span>}
                        </div>
                    </div>
                    {stops.length > 0 && <RouteStrip line={line} label={`${title} 지나온 노선`} stops={stops} />}
                    <div className="grid grid-cols-2 gap-2">
                        <ButtonLink href="/workout" variant="secondary">
                            기록 보기
                        </ButtonLink>
                        <Button variant="ghost" onClick={() => setOptionsOpen(true)}>
                            한 번 더 하기
                        </Button>
                    </div>
                </Surface>
            )
        }
        if (latestRoutine) {
            const payload = latestRoutine.finalRoutinePayload
            const blocks = payload.routineBlocks ?? []
            const line = lineForRoutine(latestRoutine.targetSplitLabel, blocks.flatMap((b) => b.primaryMuscles ?? []))
            const stops = toStops(blocks.map((b) => b.exerciseName || "운동"))
            const title = payload.summaryTitle?.trim() || splitTitle(latestRoutine.targetSplitLabel) || "저장한 루틴"
            return (
                <Surface tone="sunken" className="flex flex-col gap-4">
                    <div>
                        <LineBadge line={line} />
                        <p className="mt-1.5 text-title-sm font-bold text-ink">{title}</p>
                        <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                            {blocks.length}개 운동 · 약 {payload.totalEstimatedTime}분
                        </p>
                    </div>
                    {stops.length > 0 && <RouteStrip line={line} label={`${title} 노선`} stops={stops} />}
                    <div className="flex flex-col gap-1">
                        <Button
                            variant={unfinished ? "secondary" : "primary"}
                            size="lg"
                            block
                            line={line}
                            icon={<Play className="size-4" aria-hidden />}
                            onClick={() =>
                                guardStart(() => router.push(prepareFinalRoutineForPlay(latestRoutine, { confirmOverwrite: () => true })))
                            }
                        >
                            출발하기
                        </Button>
                        <Button variant="ghost" block onClick={() => setOptionsOpen(true)}>
                            다른 루틴 만들기
                        </Button>
                    </div>
                </Surface>
            )
        }
        return (
            <Surface tone="sunken" className="flex flex-col gap-4">
                <div>
                    <p className="text-title-sm font-bold text-ink">오늘 탈 노선이 없어요</p>
                    <p className="mt-0.5 text-body-sm text-ink-2">AI가 몸 상태에 맞춰 짜 주거나, 직접 운동을 골라 만들 수 있어요.</p>
                </div>
                <RouteStrip muted line="mixed" label="루틴을 만드는 순서" stops={GUIDE_STOPS} />
                {createButtons}
            </Surface>
        )
    }

    return (
        <>
            <Section title="오늘의 노선">
                <div className="flex flex-col gap-3">
                    {renderRecovery()}
                    {renderResume()}
                    {renderToday()}
                </div>
            </Section>

            {!isLoading && !hasError && (
                <Section title="이번 주 운행">
                    <ol className="relative grid grid-cols-7 text-center" aria-label="이번 주 운동 기록">
                        <span aria-hidden className="absolute inset-x-[7.14%] top-[1.95rem] h-1 rounded-full bg-rail" />
                        {week.map((date, i) => {
                            const session = sessions.find((s) => String(s.workoutDate).slice(0, 10) === date)
                            const line = session ? lineForRoutine(session.targetSplitLabel ?? session.splitLabel) : null
                            const isToday = date === today
                            return (
                                <li key={date} className="flex flex-col items-center gap-1.5">
                                    <span className={isToday ? "text-caption font-bold text-ink" : "text-caption text-ink-2"}>{WEEKDAYS[i]}</span>
                                    <span
                                        aria-hidden
                                        className="relative z-10 size-3.5 rounded-full border-[3px] bg-ground"
                                        style={
                                            line
                                                ? { borderColor: ROUTE_LINE_COLOR_VAR[line], background: ROUTE_LINE_COLOR_VAR[line] }
                                                : { borderColor: isToday ? "var(--color-ink)" : "var(--color-rail)" }
                                        }
                                    />
                                    <span className="sr-only">
                                        {date} {session ? getWorkoutTitle(session) : "운동 없음"}
                                    </span>
                                </li>
                            )
                        })}
                    </ol>
                </Section>
            )}

            <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="새 루틴 만들기" description="AI에게 맡기거나 직접 운동을 고를 수 있어요.">
                {createButtons}
            </Sheet>

            <Sheet
                open={pendingStart !== null}
                onClose={() => setPendingStart(null)}
                title={OVERWRITE_CONFIRM_COPY.title}
                description={OVERWRITE_CONFIRM_COPY.description}
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => {
                                setPendingStart(null)
                                router.push(PLAYER_PATH)
                            }}
                        >
                            {OVERWRITE_CONFIRM_COPY.resume}
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => {
                                const action = pendingStart
                                setPendingStart(null)
                                action?.()
                            }}
                        >
                            {OVERWRITE_CONFIRM_COPY.replace}
                        </Button>
                    </div>
                }
            >
                {unfinished && (
                    <p className="text-body-sm text-ink-2 tabular-nums">
                        {unfinished.title} · {unfinished.doneSets} / {unfinished.totalSets} 세트 완료
                    </p>
                )}
            </Sheet>

            <Sheet
                open={discardFailedOpen}
                onClose={() => setDiscardFailedOpen(false)}
                title="이 기록을 버릴까요?"
                description="버리면 저장하지 못한 운동 기록을 되살릴 수 없어요."
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={() => setDiscardFailedOpen(false)}>
                            취소
                        </Button>
                        <Button variant="danger" size="lg" onClick={handleDiscardFailedSave}>
                            버리기
                        </Button>
                    </div>
                }
            >
                {failedSave && (
                    <p className="text-body-sm text-ink-2 tabular-nums">
                        {failedSave.payload.splitLabel || "운동"} · {failedSave.payload.sets.length}세트
                    </p>
                )}
            </Sheet>
        </>
    )
}
