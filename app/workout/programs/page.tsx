"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AxiosError } from "axios"
import { Archive, CheckCircle2, ChevronRight, ListChecks, Plus, RotateCcw, Timer } from "lucide-react"
import programApiClient from "@/lib/api/program/programApiClient"
import type { ProgramSummaryResponse, ProgramStatus } from "@/types/program"

const STATUS_LABEL: Record<ProgramStatus, string> = {
    ACTIVE: "진행 중",
    COMPLETED: "완료",
    ARCHIVED: "보관됨",
}

function statusClasses(status: ProgramStatus): string {
    if (status === "ACTIVE") return "bg-blue-50 text-blue-700"
    if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700"
    return "bg-slate-100 text-slate-500"
}

function activateErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.status === 409) {
        return "이미 진행 중인 프로그램이 있습니다. 먼저 기존 프로그램을 보관한 뒤 다시 활성화해 주세요."
    }
    return "프로그램을 다시 활성화하지 못했습니다. 잠시 후 다시 시도해 주세요."
}

export default function ProgramListPage() {
    const router = useRouter()
    const [programs, setPrograms] = useState<ProgramSummaryResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [activatingId, setActivatingId] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        programApiClient
            .getPrograms()
            .then((data) => setPrograms(data ?? []))
            .catch(() => setPrograms([]))
            .finally(() => setLoading(false))
    }, [])

    const activeProgram = programs.find((program) => program.status === "ACTIVE")

    const activateProgram = async (programId: string) => {
        if (activatingId) return
        setActivatingId(programId)
        setMessage(null)
        try {
            const activated = await programApiClient.activateProgram(programId)
            router.push(`/workout/programs/${activated.programId}`)
        } catch (error) {
            setMessage(activateErrorMessage(error))
        } finally {
            setActivatingId(null)
        }
    }

    return (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 p-4 pb-10">
            <header className="px-1">
                <p className="text-xs font-black uppercase tracking-wide text-blue-500">Program</p>
                <h1 className="text-2xl font-extrabold text-slate-900">운동 프로그램</h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    저장한 루틴을 순서대로 묶어 진행해요.
                </p>
            </header>

            <Link
                href="/workout/programs/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
                <Plus className="h-4 w-4" />
                새 프로그램 만들기
            </Link>

            {message && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-relaxed text-red-700">
                    {message}
                </p>
            )}

            {activeProgram && (
                <Link
                    href={`/workout/programs/${activeProgram.programId}`}
                    className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition-colors hover:bg-blue-50"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            <Timer className="h-3.5 w-3.5" />
                            진행 중
                        </span>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-900">{activeProgram.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        현재 {activeProgram.currentPosition}/{activeProgram.totalItems}
                    </p>
                    {activeProgram.nextItem && (
                        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                            다음은 {activeProgram.nextItem.title} 차례
                        </p>
                    )}
                </Link>
            )}

            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <ListChecks className="h-5 w-5 text-slate-500" />
                    <h2 className="text-base font-extrabold text-slate-800">내 프로그램</h2>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
                        ))}
                    </div>
                ) : programs.length === 0 ? (
                    <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <ListChecks className="h-7 w-7" />
                        </div>
                        <p className="text-base font-extrabold text-slate-800">아직 프로그램이 없습니다</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            저장된 루틴을 두 개 이상 골라 순서대로 묶어보세요.
                        </p>
                    </div>
                ) : (
                    programs.map((program) => (
                        <div key={program.programId} className="rounded-3xl bg-white p-4 shadow-sm">
                            <Link
                                href={`/workout/programs/${program.programId}`}
                                className="flex items-center gap-3 transition-colors hover:bg-slate-50"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                    {program.status === "COMPLETED" ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                    ) : program.status === "ARCHIVED" ? (
                                        <Archive className="h-5 w-5" />
                                    ) : (
                                        <ListChecks className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-2">
                                        <h3 className="truncate text-sm font-extrabold text-slate-900">{program.name}</h3>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${statusClasses(program.status)}`}>
                                            {STATUS_LABEL[program.status]}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400">
                                        현재 {program.currentPosition}/{program.totalItems}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                            </Link>
                            {program.status === "ARCHIVED" && (
                                <button
                                    type="button"
                                    onClick={() => activateProgram(program.programId)}
                                    disabled={activatingId === program.programId}
                                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    {activatingId === program.programId ? "활성화 중..." : "다시 활성화"}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </section>
        </main>
    )
}
