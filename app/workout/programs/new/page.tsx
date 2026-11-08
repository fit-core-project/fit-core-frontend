"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check, ChevronLeft, Dumbbell, GripVertical, X } from "lucide-react"
import { AxiosError } from "axios"
import programApiClient from "@/lib/api/program/programApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import type { RoutineFinalResponse } from "@/types/routine"
import { getRoutineProgramDisplay, moveSelectedRoutineIds } from "@/utils/routineProgramCreation"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import {
    Button,
    ButtonLink,
    EmptyState,
    LineBadge,
    Notice,
    Section,
    Skeleton,
    StationRow,
    Surface,
    TextField,
    cx,
} from "@/components/ui"

function errorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.status === 409) {
        return "이미 진행 중인 프로그램이 있어요. 기존 프로그램을 보관한 뒤 새 프로그램을 만드세요."
    }
    return "프로그램을 만들지 못했어요. 입력을 확인하고 다시 시도하세요."
}

function routineMeta(routine: RoutineFinalResponse): string {
    const display = getRoutineProgramDisplay(routine)
    return [
        display.exerciseCount != null ? `${display.exerciseCount}개 운동` : null,
        display.estimatedTime != null ? `${display.estimatedTime}분` : null,
    ].filter(Boolean).join(" · ")
}

function routineLine(routine: RoutineFinalResponse): RouteLine {
    const blocks = routine.finalRoutinePayload?.routineBlocks ?? []
    return lineForRoutine(routine.targetSplitLabel, blocks.flatMap((block) => block.primaryMuscles ?? []))
}

export default function NewProgramPage() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [routines, setRoutines] = useState<RoutineFinalResponse[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    useEffect(() => {
        routineApiClient
            .getMyFinals(0, 100)
            .then((page) => setRoutines(page.content ?? []))
            .catch(() => setRoutines([]))
            .finally(() => setLoading(false))
    }, [])

    const selectedRoutines = useMemo(
        () => selectedIds
            .map((id) => routines.find((routine) => routine.routineFinalId === id))
            .filter((routine): routine is RoutineFinalResponse => Boolean(routine)),
        [routines, selectedIds]
    )

    const disabledReason = useMemo(() => {
        if (!name.trim()) return "프로그램 이름을 입력하세요."
        if (selectedIds.length < 2) return "루틴을 2개 이상 선택하세요."
        if (selectedIds.length > 20) return "루틴은 최대 20개까지 선택할 수 있어요."
        return null
    }, [name, selectedIds.length])

    const toggleRoutine = (routineId: string) => {
        setMessage(null)
        setSelectedIds((current) => {
            if (current.includes(routineId)) return current.filter((id) => id !== routineId)
            if (current.length >= 20) return current
            return [...current, routineId]
        })
    }

    const removeRoutine = (routineId: string) => {
        setMessage(null)
        setSelectedIds((current) => current.filter((id) => id !== routineId))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        setSelectedIds((current) => {
            const fromIndex = current.indexOf(String(active.id))
            const toIndex = current.indexOf(String(over.id))
            return moveSelectedRoutineIds(current, fromIndex, toIndex)
        })
    }

    const createProgram = async () => {
        if (disabledReason || creating) return
        setCreating(true)
        setMessage(null)
        try {
            const program = await programApiClient.createProgram({
                name: name.trim(),
                routineFinalIds: selectedIds,
            })
            router.push(`/workout/programs/${program.programId}`)
        } catch (error) {
            setMessage(errorMessage(error))
        } finally {
            setCreating(false)
        }
    }

    return (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 bg-ground px-4 pt-3">
            <header>
                <Button
                    variant="ghost"
                    className="-ml-3"
                    onClick={() => router.back()}
                    icon={<ChevronLeft className="size-4" aria-hidden />}
                >
                    돌아가기
                </Button>
                <h1 className="mt-1 text-title font-bold text-ink">운동 프로그램 만들기</h1>
                <p className="mt-1 text-body-sm text-ink-2">저장한 루틴을 원하는 순서로 이어 환승 노선을 만들어요.</p>
            </header>

            <TextField
                label="프로그램 이름"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: PPL 6분할"
            />

            <Section
                title="선택한 순서"
                action={<span className="text-body-sm font-medium text-ink-2 tabular-nums">{selectedIds.length}/20</span>}
            >
                {selectedRoutines.length === 0 ? (
                    <Surface tone="sunken">
                        <p className="text-body-sm text-ink-2">아래 저장 루틴에서 진행할 순서대로 선택하세요.</p>
                    </Surface>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                            <ol aria-label="프로그램 노선" className="flex flex-col">
                                {selectedRoutines.map((routine, index) => {
                                    const next = selectedRoutines[index + 1]
                                    return (
                                        <SortableRoutineStation
                                            key={routine.routineFinalId}
                                            routine={routine}
                                            position={index + 1}
                                            line={routineLine(routine)}
                                            nextLine={next ? routineLine(next) : null}
                                            onRemove={() => removeRoutine(routine.routineFinalId)}
                                        />
                                    )
                                })}
                            </ol>
                        </SortableContext>
                    </DndContext>
                )}
            </Section>

            <Section title="저장 루틴" aria-busy={loading || undefined}>
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {[0, 1, 2].map((item) => (
                            <Skeleton key={item} className="h-20 rounded-panel" />
                        ))}
                    </div>
                ) : routines.length === 0 ? (
                    <Surface tone="sunken">
                        <EmptyState
                            icon={<Dumbbell aria-hidden />}
                            title="저장된 루틴이 없어요"
                            body="프로그램은 저장 루틴 2개 이상으로 만들 수 있어요."
                            action={
                                <ButtonLink href="/" variant="secondary">
                                    루틴 만들러 가기
                                </ButtonLink>
                            }
                        />
                    </Surface>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {routines.map((routine) => {
                            const selectedIndex = selectedIds.indexOf(routine.routineFinalId)
                            const selected = selectedIndex >= 0
                            const display = getRoutineProgramDisplay(routine)
                            const meta = routineMeta(routine)
                            const line = routineLine(routine)
                            const color = ROUTE_LINE_COLOR_VAR[line]

                            return (
                                <li key={routine.routineFinalId}>
                                    <button
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleRoutine(routine.routineFinalId)}
                                        className={cx(
                                            "flex min-h-11 w-full items-start gap-3 rounded-panel border p-4 text-left transition-[background-color,border-color] duration-150",
                                            selected ? "border-ink bg-surface" : "border-hairline bg-ground hover:bg-surface",
                                        )}
                                    >
                                        <span
                                            aria-hidden
                                            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-body-sm font-bold tabular-nums"
                                            style={{
                                                borderColor: selected ? color : "var(--color-rail)",
                                                background: selected ? color : "var(--color-ground)",
                                                color: selected ? "white" : "var(--color-ink-3)",
                                            }}
                                        >
                                            {selected ? selectedIndex + 1 : <Check className="size-4" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <LineBadge line={line} label={display.splitLabel ?? undefined} className="shrink-0" />
                                                <span className="truncate text-body font-bold text-ink">{display.title}</span>
                                            </span>
                                            {meta && <span className="mt-1 block text-body-sm text-ink-2 tabular-nums">{meta}</span>}
                                            {display.exercisePreview.length > 0 && (
                                                <span className="mt-0.5 block truncate text-body-sm text-ink-2">
                                                    {display.exercisePreview.join(" · ")}
                                                </span>
                                            )}
                                            <span className="mt-1 block text-caption text-ink-2 tabular-nums">
                                                {selected ? `${selectedIndex + 1}번째 역으로 선택됨` : display.savedDateLabel}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Section>

            <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-hairline bg-ground px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {message && <Notice tone="danger">{message}</Notice>}
                {disabledReason && <p className="text-caption text-ink-2">{disabledReason}</p>}
                <Button
                    variant="primary"
                    size="lg"
                    block
                    onClick={createProgram}
                    disabled={Boolean(disabledReason)}
                    loading={creating}
                >
                    {creating ? "만드는 중" : "프로그램 만들기"}
                </Button>
            </div>
        </main>
    )
}

function SortableRoutineStation({
    routine,
    position,
    line,
    nextLine,
    onRemove,
}: {
    routine: RoutineFinalResponse
    position: number
    line: RouteLine
    nextLine: RouteLine | null
    onRemove: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: routine.routineFinalId,
    })
    const display = getRoutineProgramDisplay(routine)
    const color = ROUTE_LINE_COLOR_VAR[line]
    const meta = [
        display.exerciseCount != null ? `${display.exerciseCount}개 운동` : null,
        display.estimatedTime != null ? `${display.estimatedTime}분` : null,
    ].filter(Boolean).join(" · ")

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cx(isDragging && "relative z-10 opacity-70")}
        >
            <StationRow
                color={color}
                markerColor={color}
                segmentColor={nextLine ? ROUTE_LINE_COLOR_VAR[nextLine] : undefined}
                isCurrent={false}
                isDone={false}
                isLast={!nextLine}
                station={{
                    title: (
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-body-sm font-bold text-ink-2 tabular-nums">{position}</span>
                            <span className="truncate">{display.title}</span>
                        </span>
                    ),
                    meta: (
                        <span className="flex flex-wrap items-center gap-1.5">
                            <LineBadge line={line} label={display.splitLabel ?? undefined} />
                            {meta && <span>{meta}</span>}
                        </span>
                    ),
                    trailing: (
                        <span className="flex shrink-0 items-center">
                            <button
                                type="button"
                                {...attributes}
                                {...listeners}
                                aria-label={`${display.title} 순서 바꾸기`}
                                className="inline-flex size-11 cursor-grab touch-none items-center justify-center rounded-control text-ink-2 hover:bg-surface active:cursor-grabbing"
                            >
                                <GripVertical className="size-5" aria-hidden />
                            </button>
                            <button
                                type="button"
                                onClick={onRemove}
                                aria-label={`${display.title} 빼기`}
                                className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                            >
                                <X className="size-5" aria-hidden />
                            </button>
                        </span>
                    ),
                }}
            />
        </li>
    )
}
