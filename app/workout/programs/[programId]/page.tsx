"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AxiosError } from "axios"
import { Archive, CheckCircle2, ChevronLeft, Pencil, Play, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import programApiClient from "@/lib/api/program/programApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import type { ProgramDetailResponse, ProgramItemState, ProgramStatus } from "@/types/program"
import type { RoutineDraft } from "@/types/routine"
import { buildProgramPlayerContext, clearProgramContextIfProgram, setProgramContext } from "@/utils/programContext"
import { splitLabel } from "@/utils/displayLabels"
import { lineForRoutine } from "@/utils/routeLine"
import {
    Button,
    EmptyState,
    LineBadge,
    Route,
    Section,
    Sheet,
    Skeleton,
    Surface,
    Tag,
    TextField,
    type StationStatus,
} from "@/components/ui"

const STATE_LABEL: Record<ProgramItemState, string> = {
    DONE: "완료",
    CURRENT: "현재",
    UPCOMING: "예정",
}

const STATUS_LABEL: Record<ProgramStatus, string> = {
    ACTIVE: "진행 중",
    COMPLETED: "완료",
    ARCHIVED: "보관됨",
}

const STATION_STATUS: Record<ProgramItemState, StationStatus> = {
    DONE: "done",
    CURRENT: "current",
    UPCOMING: "upcoming",
}

type ConfirmKind = "archive" | "delete"

export default function ProgramDetailPage() {
    const params = useParams<{ programId: string }>()
    const router = useRouter()
    const programId = params.programId

    const [program, setProgram] = useState<ProgramDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)
    const [archiving, setArchiving] = useState(false)
    const [activating, setActivating] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameDraft, setNameDraft] = useState("")
    const [savingName, setSavingName] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirm, setConfirm] = useState<ConfirmKind | null>(null)

    useEffect(() => {
        if (!programId) return
        programApiClient
            .getProgram(programId)
            .then((data) => {
                setProgram(data)
                setNameDraft(data.name)
            })
            .catch(() => {
                toast.error("프로그램을 불러오지 못했어요.")
                router.push("/workout/programs")
            })
            .finally(() => setLoading(false))
    }, [programId, router])

    const startNextRoutine = async () => {
        if (!program?.nextItem || starting) return
        setStarting(true)
        try {
            const finalRoutine = await routineApiClient.getFinal(program.nextItem.routineFinalId)
            const payload = finalRoutine.finalRoutinePayload
            const draft: RoutineDraft = {
                routineDraftId: finalRoutine.routineDraftId,
                generationStatus: payload.generationStatus,
                statusReasonCode: payload.statusReasonCode,
                isFallback: payload.fallback,
                totalEstimatedTime: payload.totalEstimatedTime,
                summaryTitle: payload.summaryTitle,
                rationaleSummary: payload.rationaleSummary ?? [],
                warnings: payload.warnings ?? [],
                routineBlocks: payload.routineBlocks,
            }
            localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))
            localStorage.setItem("fitcore_routine_final_id", finalRoutine.routineFinalId)
            if (finalRoutine.targetSplitLabel) {
                localStorage.setItem("fitcore_split_label", finalRoutine.targetSplitLabel)
            }
            setProgramContext(buildProgramPlayerContext(
                program.programId,
                program.nextItem.programItemId,
                finalRoutine.routineFinalId
            ))
            router.push("/ai_routine/player")
        } catch {
            toast.error("다음 루틴을 시작하지 못했어요. 잠시 후 다시 시도하세요.")
        } finally {
            setStarting(false)
        }
    }

    const archiveProgram = async () => {
        if (!program || archiving) return
        setConfirm(null)
        setArchiving(true)
        try {
            await programApiClient.archiveProgram(program.programId)
            clearProgramContextIfProgram(program.programId)
            toast.success("프로그램을 보관했어요.")
            router.push("/workout/programs")
        } catch {
            toast.error("프로그램을 보관하지 못했어요.")
        } finally {
            setArchiving(false)
        }
    }

    const updateProgramName = async () => {
        if (!program || savingName) return
        const nextName = nameDraft.trim()
        if (!nextName) {
            toast.error("프로그램 이름을 입력하세요.")
            return
        }
        setSavingName(true)
        try {
            const updated = await programApiClient.updateProgram(program.programId, { name: nextName })
            setProgram(updated)
            setNameDraft(updated.name)
            setEditingName(false)
            toast.success("프로그램 이름을 바꿨어요.")
        } catch {
            toast.error("프로그램 이름을 바꾸지 못했어요.")
        } finally {
            setSavingName(false)
        }
    }

    const deleteProgramPermanently = async () => {
        if (!program || deleting) return
        setConfirm(null)
        setDeleting(true)
        try {
            await programApiClient.deleteProgramPermanently(program.programId)
            clearProgramContextIfProgram(program.programId)
            toast.success("프로그램을 영구 삭제했어요.")
            router.push("/workout/programs")
        } catch {
            toast.error("프로그램을 영구 삭제하지 못했어요. 보관된 프로그램만 삭제할 수 있어요.")
        } finally {
            setDeleting(false)
        }
    }

    const activateProgram = async () => {
        if (!program || activating) return
        setActivating(true)
        try {
            const activated = await programApiClient.activateProgram(program.programId)
            setProgram(activated)
            toast.success("프로그램을 다시 활성화했어요.")
        } catch (error) {
            if (error instanceof AxiosError && error.response?.status === 409) {
                toast.error("이미 진행 중인 프로그램이 있어요. 기존 프로그램을 보관한 뒤 다시 활성화하세요.")
            } else {
                toast.error("프로그램을 다시 활성화하지 못했어요.")
            }
        } finally {
            setActivating(false)
        }
    }

    if (loading) {
        return (
            <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 bg-ground px-4 pt-5" aria-busy="true">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-40 rounded-panel" />
                <Skeleton className="h-64 rounded-panel" />
            </main>
        )
    }

    if (!program) return null

    const isActive = program.status === "ACTIVE"
    const isCompleted = program.status === "COMPLETED"
    const isArchived = program.status === "ARCHIVED"
    const next = program.nextItem
    const nextLine = next ? lineForRoutine(next.targetSplitLabel) : "mixed"

    const stations = program.items.map((item) => ({
        key: item.programItemId,
        line: lineForRoutine(item.targetSplitLabel),
        status: STATION_STATUS[item.state],
        title: item.title,
        meta: [
            `${item.position}번째`,
            splitLabel(item.targetSplitLabel),
            item.estimatedTime ? `${item.estimatedTime}분` : null,
        ].filter(Boolean).join(" · "),
        trailing: <Tag className="shrink-0">{STATE_LABEL[item.state]}</Tag>,
    }))

    return (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 bg-ground px-4 pb-10 pt-3">
            <header>
                <Button
                    variant="ghost"
                    className="-ml-3"
                    onClick={() => router.push("/workout/programs")}
                    icon={<ChevronLeft className="size-4" aria-hidden />}
                >
                    프로그램 목록
                </Button>
                {editingName ? (
                    <div className="mt-1 flex flex-col gap-2">
                        <TextField
                            label="프로그램 이름"
                            value={nameDraft}
                            onChange={(event) => setNameDraft(event.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setNameDraft(program.name)
                                    setEditingName(false)
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                variant="primary"
                                onClick={updateProgramName}
                                disabled={!nameDraft.trim()}
                                loading={savingName}
                            >
                                {savingName ? "저장 중" : "이름 저장"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-1">
                        <Tag>{STATUS_LABEL[program.status]}</Tag>
                        <div className="mt-1.5 flex items-start gap-1">
                            <h1 className="min-w-0 break-words text-title font-bold text-ink">{program.name}</h1>
                            <button
                                type="button"
                                onClick={() => setEditingName(true)}
                                className="-mt-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                                aria-label="프로그램 이름 바꾸기"
                            >
                                <Pencil className="size-4" aria-hidden />
                            </button>
                        </div>
                        <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                            현재 {program.currentPosition}/{program.totalItems}
                        </p>
                    </div>
                )}
            </header>

            {isActive && next ? (
                <Surface tone="sunken" className="flex flex-col gap-4">
                    <div>
                        <p className="text-body-sm text-ink-2">다음 회차</p>
                        <div className="mt-1.5">
                            <LineBadge line={nextLine} label={next.targetSplitLabel ? splitLabel(next.targetSplitLabel) : undefined} />
                        </div>
                        <h2 className="mt-1.5 break-words text-headline font-bold text-ink">{next.title}</h2>
                        <p className="mt-1 text-body-sm text-ink-2 tabular-nums">
                            {next.position}번째 역
                            {next.estimatedTime ? ` · 약 ${next.estimatedTime}분` : ""}
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="lg"
                        block
                        line={nextLine}
                        onClick={startNextRoutine}
                        loading={starting}
                        icon={<Play className="size-4" aria-hidden />}
                    >
                        {starting ? "준비 중" : "출발하기"}
                    </Button>
                </Surface>
            ) : isCompleted ? (
                <Surface tone="sunken">
                    <EmptyState
                        icon={<CheckCircle2 aria-hidden />}
                        title="종점에 도착했어요"
                        body="프로그램의 모든 회차를 마쳤어요."
                    />
                </Surface>
            ) : isArchived ? (
                <Surface tone="sunken">
                    <EmptyState
                        icon={<Archive aria-hidden />}
                        title="보관된 프로그램이에요"
                        body="보관된 프로그램은 시작할 수 없어요. 다시 활성화하면 진행 중으로 돌아가요."
                        action={
                            <Button
                                variant="primary"
                                onClick={activateProgram}
                                loading={activating}
                                icon={<RotateCcw className="size-4" aria-hidden />}
                            >
                                {activating ? "활성화 중" : "다시 활성화"}
                            </Button>
                        }
                    />
                </Surface>
            ) : null}

            <Section title="전체 노선">
                <Route stations={stations} mode="progress" label={`${program.name} 노선`} />
            </Section>

            {!isArchived && (
                <Button
                    variant="secondary"
                    block
                    onClick={() => setConfirm("archive")}
                    loading={archiving}
                    icon={<Archive className="size-4" aria-hidden />}
                >
                    {archiving ? "보관 중" : "프로그램 보관하기"}
                </Button>
            )}

            {isArchived && (
                <Button
                    variant="ghost"
                    block
                    className="text-danger-ink"
                    onClick={() => setConfirm("delete")}
                    loading={deleting}
                    icon={<Trash2 className="size-4" aria-hidden />}
                >
                    {deleting ? "삭제 중" : "영구 삭제"}
                </Button>
            )}

            <Sheet
                open={confirm !== null}
                onClose={() => setConfirm(null)}
                title={confirm === "delete" ? "프로그램을 영구 삭제할까요?" : "프로그램을 보관할까요?"}
                description={program.name}
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => setConfirm(null)}>
                            취소
                        </Button>
                        {confirm === "delete" ? (
                            <Button variant="danger" onClick={deleteProgramPermanently}>
                                영구 삭제하기
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={archiveProgram}>
                                보관하기
                            </Button>
                        )}
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2">
                    {confirm === "delete"
                        ? "되돌릴 수 없어요. 저장 루틴과 운동 기록은 그대로 남아요."
                        : "저장 루틴과 운동 기록은 그대로 남아요. 보관한 뒤에도 다시 활성화할 수 있어요."}
                </p>
            </Sheet>
        </main>
    )
}
