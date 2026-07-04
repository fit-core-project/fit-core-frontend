"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Archive, CheckCircle2, ChevronRight, ListChecks, Plus, Timer } from "lucide-react"
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

export default function ProgramListPage() {
    const [programs, setPrograms] = useState<ProgramSummaryResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        programApiClient
            .getPrograms()
            .then((data) => setPrograms(data ?? []))
            .catch(() => setPrograms([]))
            .finally(() => setLoading(false))
    }, [])

    const activeProgram = programs.find((program) => program.status === "ACTIVE")

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
                        <Link
                            key={program.programId}
                            href={`/workout/programs/${program.programId}`}
                            className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
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
                    ))
                )}
            </section>
        </main>
    )
}
