"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AxiosError } from "axios"
import { ChevronRight, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react"
import programApiClient from "@/lib/api/program/programApiClient"
import type { ProgramSummaryResponse, ProgramStatus } from "@/types/program"
import { Button, ButtonLink, EmptyState, LineBadge, Notice, Section, Sheet, Skeleton, Surface, Tag } from "@/components/ui"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR } from "@/utils/routeLine"
import { splitLabel } from "@/utils/displayLabels"

const STATUS_LABEL: Record<ProgramStatus, string> = {
    ACTIVE: "진행 중",
    COMPLETED: "완료",
    ARCHIVED: "보관됨",
}

function activateErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.status === 409) {
        return "이미 진행 중인 프로그램이 있어요. 기존 프로그램을 보관한 뒤 다시 활성화하세요."
    }
    return "프로그램을 다시 활성화하지 못했어요. 잠시 후 다시 시도하세요."
}

export default function ProgramListPage() {
    const router = useRouter()
    const [programs, setPrograms] = useState<ProgramSummaryResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [activatingId, setActivatingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
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

    const deleteProgramPermanently = async (programId: string) => {
        if (deletingId) return
        setConfirmDeleteId(null)
        setDeletingId(programId)
        setMessage(null)
        try {
            await programApiClient.deleteProgramPermanently(programId)
            setPrograms((current) => current.filter((program) => program.programId !== programId))
        } catch {
            setMessage("프로그램을 영구 삭제하지 못했어요. 보관된 프로그램만 삭제할 수 있어요.")
        } finally {
            setDeletingId(null)
        }
    }

    const confirmProgram = programs.find((program) => program.programId === confirmDeleteId)

    return (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 bg-ground px-4 pb-10 pt-5">
            <header>
                <h1 className="text-title font-bold text-ink">운동 프로그램</h1>
                <p className="mt-1 text-body-sm text-ink-2">저장한 루틴을 순서대로 이어 타는 환승 노선이에요.</p>
            </header>

            <ButtonLink href="/workout/programs/new" variant="primary" size="lg" block icon={<Plus className="size-4" aria-hidden />}>
                새 프로그램 만들기
            </ButtonLink>

            {message && <Notice tone="danger">{message}</Notice>}

            {activeProgram && (
                <Section title="진행 중인 노선">
                    <ActiveProgramCard program={activeProgram} />
                </Section>
            )}

            <Section title="내 프로그램" aria-busy={loading || undefined}>
                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2].map((item) => (
                            <Skeleton key={item} className="h-20 rounded-panel" />
                        ))}
                    </div>
                ) : programs.length === 0 ? (
                    <Surface tone="sunken">
                        <EmptyState
                            icon={<ListChecks aria-hidden />}
                            title="아직 프로그램이 없어요"
                            body="저장 루틴을 두 개 이상 골라 순서대로 묶어 보세요."
                            action={
                                <ButtonLink href="/workout/programs/new" variant="secondary">
                                    프로그램 만들기
                                </ButtonLink>
                            }
                        />
                    </Surface>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {programs.map((program) => {
                            const busy = activatingId === program.programId || deletingId === program.programId
                            return (
                                <li key={program.programId}>
                                    <Surface padded={false}>
                                        <Link
                                            href={`/workout/programs/${program.programId}`}
                                            className="flex min-h-11 items-center gap-3 rounded-panel p-4 hover:bg-surface"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate text-body font-bold text-ink">{program.name}</span>
                                                    <Tag className="shrink-0">{STATUS_LABEL[program.status]}</Tag>
                                                </span>
                                                <ProgressDots program={program} />
                                                <span className="mt-1 block text-body-sm text-ink-2 tabular-nums">
                                                    현재 {program.currentPosition}/{program.totalItems}
                                                </span>
                                            </span>
                                            <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                                        </Link>
                                        {program.status === "ARCHIVED" && (
                                            <div className="grid grid-cols-2 gap-2 border-t border-hairline p-3">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => activateProgram(program.programId)}
                                                    disabled={busy}
                                                    loading={activatingId === program.programId}
                                                    icon={<RotateCcw className="size-4" aria-hidden />}
                                                >
                                                    {activatingId === program.programId ? "활성화 중" : "다시 활성화"}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="text-danger-ink"
                                                    onClick={() => setConfirmDeleteId(program.programId)}
                                                    disabled={busy}
                                                    loading={deletingId === program.programId}
                                                    icon={<Trash2 className="size-4" aria-hidden />}
                                                >
                                                    {deletingId === program.programId ? "삭제 중" : "영구 삭제"}
                                                </Button>
                                            </div>
                                        )}
                                    </Surface>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Section>

            <Sheet
                open={Boolean(confirmDeleteId)}
                onClose={() => setConfirmDeleteId(null)}
                title="프로그램을 영구 삭제할까요?"
                description={confirmProgram ? confirmProgram.name : undefined}
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                            취소
                        </Button>
                        <Button variant="danger" onClick={() => confirmDeleteId && deleteProgramPermanently(confirmDeleteId)}>
                            영구 삭제하기
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2">되돌릴 수 없어요. 저장 루틴과 운동 기록은 그대로 남아요.</p>
            </Sheet>
        </main>
    )
}

function ActiveProgramCard({ program }: { program: ProgramSummaryResponse }) {
    const next = program.nextItem
    const line = next ? lineForRoutine(next.targetSplitLabel) : "mixed"
    return (
        <Surface tone="sunken" className="flex flex-col gap-4">
            <div>
                <p className="text-body font-bold text-ink">{program.name}</p>
                <p className="mt-0.5 text-body-sm text-ink-2 tabular-nums">
                    현재 {program.currentPosition}/{program.totalItems}
                </p>
            </div>
            {next && (
                <div>
                    <p className="text-caption text-ink-2">다음 회차</p>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                        <LineBadge line={line} label={next.targetSplitLabel ? splitLabel(next.targetSplitLabel) : undefined} />
                        <span className="truncate text-title-sm font-bold text-ink">{next.title}</span>
                    </div>
                </div>
            )}
            <ButtonLink
                href={`/workout/programs/${program.programId}`}
                variant="primary"
                line={next ? line : undefined}
                block
            >
                노선 보기
            </ButtonLink>
        </Surface>
    )
}

/**
 * Compact progress preview. The summary response carries only the next item's split,
 * so the next stop is drawn in its line colour and the rest on the rail.
 */
function ProgressDots({ program }: { program: ProgramSummaryResponse }) {
    const total = Math.min(program.totalItems, 20)
    if (total <= 0) return null
    const nextPosition = program.nextItem?.position ?? null
    const nextColor = program.nextItem ? lineForRoutine(program.nextItem.targetSplitLabel) : null
    return (
        <span aria-hidden className="mt-2 flex items-center">
            {Array.from({ length: total }, (_, index) => {
                const position = index + 1
                const isNext = position === nextPosition && nextColor != null
                const isDone = program.status === "COMPLETED" || (nextPosition != null && position < nextPosition)
                return (
                    <span key={position} className="flex items-center">
                        {index > 0 && <span className="h-0.5 w-3" style={{ background: isDone || isNext ? "var(--color-ink-2)" : "var(--color-rail)" }} />}
                        <span
                            className="size-2.5 rounded-full border-2"
                            style={{
                                borderColor: isNext && nextColor ? ROUTE_LINE_COLOR_VAR[nextColor] : isDone ? "var(--color-ink-2)" : "var(--color-rail)",
                                background: isDone ? "var(--color-ink-2)" : "var(--color-ground)",
                            }}
                        />
                    </span>
                )
            })}
        </span>
    )
}
