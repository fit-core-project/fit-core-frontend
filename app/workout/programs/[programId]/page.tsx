"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Archive, CheckCircle2, ChevronLeft, Circle, Play, Timer } from "lucide-react"
import { toast } from "sonner"
import programApiClient from "@/lib/api/program/programApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import type { ProgramDetailResponse, ProgramItemResponse, ProgramItemState } from "@/types/program"
import type { RoutineDraft } from "@/types/routine"
import { buildProgramPlayerContext, PROGRAM_CONTEXT_STORAGE_KEY } from "@/utils/programContext"

const STATE_LABEL: Record<ProgramItemState, string> = {
    DONE: "완료",
    CURRENT: "현재",
    UPCOMING: "예정",
}

function stateClasses(state: ProgramItemState): string {
    if (state === "DONE") return "bg-emerald-50 text-emerald-700"
    if (state === "CURRENT") return "bg-blue-50 text-blue-700"
    return "bg-slate-100 text-slate-500"
}

function itemIcon(item: ProgramItemResponse) {
    if (item.state === "DONE") return <CheckCircle2 className="h-5 w-5" />
    if (item.state === "CURRENT") return <Timer className="h-5 w-5" />
    return <Circle className="h-5 w-5" />
}

export default function ProgramDetailPage() {
    const params = useParams<{ programId: string }>()
    const router = useRouter()
    const programId = params.programId

    const [program, setProgram] = useState<ProgramDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)
    const [archiving, setArchiving] = useState(false)

    useEffect(() => {
        if (!programId) return
        programApiClient
            .getProgram(programId)
            .then(setProgram)
            .catch(() => {
                toast.error("프로그램을 불러오지 못했습니다.")
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
            localStorage.setItem(
                PROGRAM_CONTEXT_STORAGE_KEY,
                JSON.stringify(buildProgramPlayerContext(
                    program.programId,
                    program.nextItem.programItemId,
                    finalRoutine.routineFinalId
                ))
            )
            router.push("/ai_routine/player")
        } catch {
            toast.error("다음 루틴을 시작하지 못했습니다.")
        } finally {
            setStarting(false)
        }
    }

    const archiveProgram = async () => {
        if (!program || archiving) return
        const ok = window.confirm("이 프로그램을 보관할까요? 저장 루틴과 운동 기록은 삭제되지 않습니다.")
        if (!ok) return
        setArchiving(true)
        try {
            await programApiClient.archiveProgram(program.programId)
            toast.success("프로그램을 보관했습니다.")
            router.push("/workout/programs")
        } catch {
            toast.error("프로그램을 보관하지 못했습니다.")
        } finally {
            setArchiving(false)
        }
    }

    if (loading) {
        return (
            <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 p-4">
                <div className="h-28 animate-pulse rounded-3xl bg-white shadow-sm" />
                <div className="h-20 animate-pulse rounded-3xl bg-white shadow-sm" />
                <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />
            </main>
        )
    }

    if (!program) return null

    const isActive = program.status === "ACTIVE"
    const isCompleted = program.status === "COMPLETED"
    const isArchived = program.status === "ARCHIVED"

    return (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 p-4 pb-10">
            <header className="px-1">
                <button
                    type="button"
                    onClick={() => router.push("/workout/programs")}
                    className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500"
                >
                    <ChevronLeft className="h-4 w-4" />
                    프로그램 목록
                </button>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="break-words text-2xl font-extrabold text-slate-900">{program.name}</h1>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            현재 {program.currentPosition}/{program.totalItems}
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {isActive ? "진행 중" : isCompleted ? "완료" : "보관됨"}
                    </span>
                </div>
            </header>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
                {isActive && program.nextItem ? (
                    <>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-500">Next</p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                            다음은 {program.nextItem.title} 차례
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                            {program.nextItem.targetSplitLabel || "custom"}
                            {program.nextItem.estimatedTime ? ` · ${program.nextItem.estimatedTime}분` : ""}
                        </p>
                        <button
                            type="button"
                            onClick={startNextRoutine}
                            disabled={starting}
                            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Play className="h-4 w-4" fill="white" />
                            {starting ? "준비 중..." : "운동 시작"}
                        </button>
                    </>
                ) : isCompleted ? (
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
                        <h2 className="text-xl font-extrabold text-slate-900">프로그램 완료</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            모든 순서를 완료했습니다.
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <Archive className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                        <h2 className="text-xl font-extrabold text-slate-900">보관된 프로그램</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            보관된 프로그램은 시작할 수 없습니다.
                        </p>
                    </div>
                )}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-extrabold text-slate-800">전체 순서</h2>
                <ol className="space-y-3">
                    {program.items.map((item) => (
                        <li
                            key={item.programItemId}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                                item.state === "CURRENT" ? "bg-blue-50" : "bg-slate-50"
                            }`}
                        >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                item.state === "DONE" ? "bg-emerald-100 text-emerald-700" :
                                    item.state === "CURRENT" ? "bg-blue-600 text-white" : "bg-white text-slate-400"
                            }`}>
                                {itemIcon(item)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-extrabold text-slate-900">
                                    {item.position}. {item.title}
                                </span>
                                <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                                    {item.targetSplitLabel || "custom"}
                                    {item.estimatedTime ? ` · ${item.estimatedTime}분` : ""}
                                </span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${stateClasses(item.state)}`}>
                                {STATE_LABEL[item.state]}
                            </span>
                        </li>
                    ))}
                </ol>
            </section>

            {!isArchived && (
                <button
                    type="button"
                    onClick={archiveProgram}
                    disabled={archiving}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                    <Archive className="h-4 w-4" />
                    {archiving ? "보관 중..." : "프로그램 보관"}
                </button>
            )}
        </main>
    )
}
