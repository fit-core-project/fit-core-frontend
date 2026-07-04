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
import { AlertCircle, Check, ChevronLeft, Dumbbell, GripVertical, X } from "lucide-react"
import { AxiosError } from "axios"
import programApiClient from "@/lib/api/program/programApiClient"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import type { RoutineFinalResponse } from "@/types/routine"
import { getRoutineProgramDisplay, moveSelectedRoutineIds } from "@/utils/routineProgramCreation"

function errorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.status === 409) {
        return "이미 진행 중인 프로그램이 있습니다. 기존 프로그램을 보관한 뒤 새 프로그램을 만들 수 있어요."
    }
    return "프로그램을 만들지 못했습니다. 입력을 확인하고 다시 시도해 주세요."
}

function routineMeta(routine: RoutineFinalResponse): string {
    const display = getRoutineProgramDisplay(routine)
    return [
        display.splitLabel,
        display.exerciseCount != null ? `${display.exerciseCount}개 운동` : null,
        display.estimatedTime != null ? `${display.estimatedTime}분` : null,
    ].filter(Boolean).join(" · ")
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
        if (!name.trim()) return "프로그램 이름을 입력해 주세요."
        if (selectedIds.length < 2) return "루틴을 2개 이상 선택해 주세요."
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
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 p-4 pb-10">
            <header className="px-1">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500"
                >
                    <ChevronLeft className="h-4 w-4" />
                    돌아가기
                </button>
                <h1 className="text-2xl font-extrabold text-slate-900">운동 프로그램 만들기</h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    저장한 루틴을 원하는 순서로 묶어 진행해요.
                </p>
            </header>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
                <label className="text-sm font-extrabold text-slate-800" htmlFor="program-name">
                    프로그램 이름
                </label>
                <input
                    id="program-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="예: PPL 6분할"
                    className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-base font-extrabold text-slate-800">선택한 순서</h2>
                    <span className="text-xs font-black text-blue-600">{selectedIds.length}/20</span>
                </div>
                {selectedRoutines.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                        아래 저장 루틴에서 진행할 순서대로 선택하세요.
                    </p>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                            <ol className="space-y-2">
                                {selectedRoutines.map((routine, index) => (
                                    <SelectedRoutineCard
                                        key={routine.routineFinalId}
                                        routine={routine}
                                        position={index + 1}
                                        onRemove={() => removeRoutine(routine.routineFinalId)}
                                    />
                                ))}
                            </ol>
                        </SortableContext>
                    </DndContext>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="px-1 text-base font-extrabold text-slate-800">저장 루틴</h2>
                {loading ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
                        ))}
                    </div>
                ) : routines.length === 0 ? (
                    <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
                        <Dumbbell className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                        <p className="text-base font-extrabold text-slate-800">저장된 루틴이 없습니다</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            프로그램은 저장 루틴 2개 이상으로 만들 수 있어요.
                        </p>
                    </div>
                ) : (
                    routines.map((routine) => {
                        const selectedIndex = selectedIds.indexOf(routine.routineFinalId)
                        const selected = selectedIndex >= 0
                        const display = getRoutineProgramDisplay(routine)
                        const meta = routineMeta(routine)

                        return (
                            <button
                                key={routine.routineFinalId}
                                type="button"
                                onClick={() => toggleRoutine(routine.routineFinalId)}
                                className={`flex w-full items-start gap-3 rounded-3xl p-4 text-left shadow-sm ring-1 transition-colors ${
                                    selected
                                        ? "bg-blue-50 ring-blue-100"
                                        : "bg-white ring-transparent hover:bg-slate-50"
                                }`}
                            >
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                        selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                                    }`}
                                >
                                    {selected ? selectedIndex + 1 : <Check className="h-4 w-4" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-extrabold text-slate-900">
                                        {display.title}
                                    </span>
                                    {meta && (
                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                                            {meta}
                                        </span>
                                    )}
                                    {display.exercisePreview.length > 0 && (
                                        <span className="mt-1 block truncate text-xs font-medium text-slate-400">
                                            {display.exercisePreview.join(" · ")}
                                        </span>
                                    )}
                                    <span className="mt-1 block text-[11px] font-bold text-slate-400">
                                        {selected
                                            ? `선택됨 · ${selectedIndex + 1}번째`
                                            : display.savedDateLabel}
                                    </span>
                                </span>
                            </button>
                        )
                    })
                )}
            </section>

            <div className="sticky bottom-3 z-10 rounded-3xl border border-slate-100 bg-white/95 p-3 shadow-xl backdrop-blur">
                {message && (
                    <p className="mb-3 flex gap-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-red-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {message}
                    </p>
                )}
                {disabledReason && (
                    <p className="mb-2 px-1 text-xs font-semibold text-slate-500">{disabledReason}</p>
                )}
                <button
                    type="button"
                    onClick={createProgram}
                    disabled={Boolean(disabledReason) || creating}
                    className="min-h-12 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
                >
                    {creating ? "만드는 중..." : "프로그램 만들기"}
                </button>
            </div>
        </main>
    )
}

function SelectedRoutineCard({
    routine,
    position,
    onRemove,
}: {
    routine: RoutineFinalResponse
    position: number
    onRemove: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: routine.routineFinalId,
    })
    const display = getRoutineProgramDisplay(routine)
    const meta = [
        display.splitLabel,
        display.exerciseCount != null ? `${display.exerciseCount}개 운동` : null,
    ].filter(Boolean).join(" · ")

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex items-center gap-3 rounded-2xl bg-blue-50 px-3 py-3 ring-1 ring-blue-100 ${
                isDragging ? "z-10 shadow-lg" : ""
            }`}
        >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                {position}
            </span>
            <button
                type="button"
                className="touch-none rounded-full p-1 text-blue-500"
                aria-label={`${display.title} 순서 이동`}
                title="순서 이동"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-800">{display.title}</span>
                {meta && <span className="mt-0.5 block text-xs font-semibold text-slate-500">{meta}</span>}
                {display.exercisePreview.length > 0 && (
                    <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">
                        {display.exercisePreview.join(" · ")}
                    </span>
                )}
            </span>
            <button
                type="button"
                onClick={onRemove}
                className="shrink-0 rounded-full p-2 text-blue-700"
                aria-label={`${display.title} 제거`}
                title="제거"
            >
                <X className="h-4 w-4" />
            </button>
        </li>
    )
}
