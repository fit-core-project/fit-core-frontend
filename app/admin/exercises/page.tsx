"use client"

import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react"
import exerciseAdminClient, { AdminExercise, ExerciseRequest } from "@/lib/api/admin/exerciseAdminClient"
import { toast } from "sonner"
import { Button, EmptyState, Sheet, Skeleton, TextField, ToggleChip } from "@/components/ui"

const MUSCLES = [
    "abductors", "abs", "adductor", "back-deltoids", "biceps", "calves",
    "chest", "forearm", "front-deltoids", "gluteal", "hamstring", "lower-back",
    "neck", "obliques", "quadriceps", "trapezius", "triceps", "upper-back",
]
const EQUIPMENT = [
    "BARBELL", "BODYWEIGHT", "CABLE", "DUMBBELL", "MACHINE",
    "BAND", "BALL", "BOX", "PLATE", "SMITH_MACHINE",
]
const PAIN_PARTS = [...MUSCLES, "knees", "head", "left-soleus", "right-soleus"]
const MOVEMENT_TYPES = ["CARDIO", "COMPOUND", "ISOLATION", "PLYOMETRIC", "STATIC"]
const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5]
const EFFICIENCY_LEVELS = [1, 2, 3, 4, 5, 6, 7]

interface FormState {
    nameKr: string
    nameEn: string
    primaryMuscle: string
    secondaryMuscle: string[]
    equipmentReq: string[]
    difficultyTier: number | null
    efficiencyTier: number | null
    painTriggers: string[]
    movementType: string
    substituteExerciseIds: string[]
}

type PageView = "list" | "new" | { type: "edit"; exercise: AdminExercise }

const toArr = (s: string | null | undefined): string[] =>
    s ? s.split(",").map((v) => v.trim()).filter(Boolean) : []

const toStr = (arr: string[]): string => arr.join(", ")

interface SelectOption {
    value: string
    label: string
}

const toOptions = (items: string[]): SelectOption[] => items.map((item) => ({ value: item, label: item }))

const EMPTY_FORM: FormState = {
    nameKr: "", nameEn: "", primaryMuscle: "", secondaryMuscle: [],
    equipmentReq: [], difficultyTier: null, efficiencyTier: null,
    painTriggers: [], movementType: "", substituteExerciseIds: [],
}

function toFormState(ex: AdminExercise): FormState {
    return {
        nameKr: ex.nameKr ?? "",
        nameEn: ex.nameEn ?? "",
        primaryMuscle: ex.primaryMuscle ?? "",
        secondaryMuscle: toArr(ex.secondaryMuscle),
        equipmentReq: toArr(ex.equipmentReq),
        difficultyTier: ex.difficultyTier ?? null,
        efficiencyTier: ex.efficiencyTier ?? null,
        painTriggers: toArr(ex.painTriggers),
        movementType: ex.movementType ?? "",
        substituteExerciseIds: toArr(ex.substituteExerciseIds),
    }
}

function toRequest(f: FormState): ExerciseRequest {
    return {
        nameKr: f.nameKr, nameEn: f.nameEn,
        primaryMuscle: f.primaryMuscle,
        secondaryMuscle: toStr(f.secondaryMuscle),
        equipmentReq: toStr(f.equipmentReq),
        difficultyTier: f.difficultyTier,
        efficiencyTier: f.efficiencyTier,
        painTriggers: toStr(f.painTriggers),
        movementType: f.movementType,
        substituteExerciseIds: toStr(f.substituteExerciseIds),
    }
}

function validate(f: FormState): string | null {
    if (!f.nameKr.trim()) return "한국어명을 입력하세요."
    if (!f.nameEn.trim()) return "영어명을 입력하세요."
    if (!f.primaryMuscle) return "주요근육을 선택하세요."
    if (!f.movementType) return "운동 유형을 선택하세요."
    if (f.difficultyTier === null) return "난이도를 선택하세요."
    if (f.efficiencyTier === null) return "효율성을 선택하세요."
    if (f.equipmentReq.length === 0) return "필요 장비를 1개 이상 선택하세요."
    if (f.painTriggers.length === 0) return "통증 유발 부위를 1개 이상 선택하세요."
    return null
}

const SELECT_CLASS =
    "min-h-12 w-full rounded-control border border-rail bg-ground px-3 text-body text-ink outline-none focus:border-line-push"

function SelectField({
    label, hint, value, options, onChange, required,
}: {
    label: string; hint?: string; value: string | number | null
    options: (string | number)[]; onChange: (v: string) => void; required?: boolean
}) {
    const id = useId()
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id} className="text-body-sm font-medium text-ink">
                {label}{required && <span className="ml-0.5 text-danger-ink" aria-hidden>*</span>}
            </label>
            <select
                id={id}
                value={value ?? ""}
                required={required}
                aria-describedby={hint ? `${id}-hint` : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={SELECT_CLASS}
            >
                <option value="">선택</option>
                {options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
            {hint && <p id={`${id}-hint`} className="text-caption text-ink-2">{hint}</p>}
        </div>
    )
}

function MultiSelectField({
    label, hint, selected, options, onChange, required,
}: {
    label: string; hint?: string; selected: string[]
    options: SelectOption[]; onChange: (v: string[]) => void; required?: boolean
}) {
    const id = useId()
    const toggle = (value: string) =>
        onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value])

    const labelByValue = new Map(options.map((option) => [option.value, option.label]))

    return (
        <fieldset className="min-w-0" aria-describedby={hint ? `${id}-hint` : undefined}>
            <legend className="mb-1.5 text-body-sm font-medium text-ink">
                {label}{required && <span className="ml-0.5 text-danger-ink" aria-hidden>*</span>}
            </legend>
            <div className="flex flex-wrap gap-1.5 rounded-panel border border-hairline bg-surface p-2">
                {options.length === 0 && (
                    <p className="px-1 py-2 text-caption text-ink-2">선택 가능한 항목이 없어요.</p>
                )}
                {options.map((item) => (
                    <ToggleChip
                        key={item.value}
                        pressed={selected.includes(item.value)}
                        onClick={() => toggle(item.value)}
                    >
                        {item.label}
                    </ToggleChip>
                ))}
            </div>
            {hint && <p id={`${id}-hint`} className="mt-1 text-caption text-ink-2">{hint}</p>}
            {selected.length > 0 && (
                <p className="mt-1 text-caption text-ink-2">
                    선택됨: {selected.map((value) => labelByValue.get(value) ?? value).join(", ")}
                </p>
            )}
        </fieldset>
    )
}

function FormView({
    initial, exercises, onBack, onSave, onDelete,
}: {
    initial?: AdminExercise
    exercises: AdminExercise[]
    onBack: () => void
    onSave: (req: ExerciseRequest) => Promise<void>
    onDelete?: () => Promise<void>
}) {
    const [form, setForm] = useState<FormState>(initial ? toFormState(initial) : EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const isEdit = !!initial

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const substituteOptions = useMemo(
        () =>
            exercises
                .filter((exercise) => exercise.primaryMuscle === form.primaryMuscle)
                .filter((exercise) => !initial || exercise.id !== initial.id)
                .map((exercise) => ({
                    value: String(exercise.id),
                    label: exercise.nameKr || exercise.nameEn || String(exercise.id),
                })),
        [exercises, form.primaryMuscle, initial],
    )

    const setPrimaryMuscle = (value: string) => {
        const allowedSubstituteIds = new Set(
            exercises
                .filter((exercise) => exercise.primaryMuscle === value)
                .filter((exercise) => !initial || exercise.id !== initial.id)
                .map((exercise) => String(exercise.id)),
        )
        setForm((prev) => ({
            ...prev,
            primaryMuscle: value,
            substituteExerciseIds: prev.substituteExerciseIds.filter((id) => allowedSubstituteIds.has(id)),
        }))
    }

    const handleSave = async () => {
        const err = validate(form)
        if (err) { toast.error(err); return }
        try {
            setSaving(true)
            await onSave(toRequest(form))
            toast.success(isEdit ? "운동을 수정했어요" : "운동을 추가했어요")
        } catch {
            toast.error("저장하지 못했어요. 다시 시도해 주세요.")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!onDelete) return
        try {
            setDeleting(true)
            await onDelete()
            setConfirmDelete(false)
            toast.success("운동을 삭제했어요")
        } catch {
            toast.error("삭제하지 못했어요. 다시 시도해 주세요.")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-ground">
            <div className="flex shrink-0 items-center gap-1 border-b border-hairline bg-ground px-2 py-1">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="목록으로"
                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface hover:text-ink"
                >
                    <ArrowLeft className="size-5" aria-hidden />
                </button>
                <h2 className="flex-1 text-title-sm font-bold text-ink">
                    {isEdit ? "운동 수정" : "새 운동 추가"}
                </h2>
                {isEdit && (
                    <Button
                        variant="danger-ghost"
                        onClick={() => setConfirmDelete(true)}
                        disabled={deleting}
                        icon={<Trash2 className="size-4" aria-hidden />}
                    >
                        삭제
                    </Button>
                )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-1 gap-3">
                    <TextField
                        label="한국어명 *"
                        value={form.nameKr}
                        onChange={(e) => set("nameKr", e.target.value)}
                        required
                    />
                    <TextField
                        label="영어명 *"
                        value={form.nameEn}
                        onChange={(e) => set("nameEn", e.target.value)}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <SelectField
                        label="주요근육" required
                        value={form.primaryMuscle} options={MUSCLES}
                        onChange={setPrimaryMuscle}
                    />
                    <SelectField
                        label="운동 유형" required
                        value={form.movementType} options={MOVEMENT_TYPES}
                        onChange={(v) => set("movementType", v)}
                    />
                    <SelectField
                        label="난이도" required
                        hint="1이 가장 낮은 진입 난이도예요. 값이 커질수록 기술 요구도가 높아요."
                        value={form.difficultyTier} options={DIFFICULTY_LEVELS}
                        onChange={(v) => set("difficultyTier", v === "" ? null : Number(v))}
                    />
                    <SelectField
                        label="효율성" required
                        hint="1이 가장 높은 효율이에요. 값이 커질수록 우선순위가 낮아요."
                        value={form.efficiencyTier} options={EFFICIENCY_LEVELS}
                        onChange={(v) => set("efficiencyTier", v === "" ? null : Number(v))}
                    />
                </div>

                <MultiSelectField
                    label="보조근육"
                    hint="선택 항목이에요. 주동근 이외의 보조 동원 근육만 지정해요."
                    selected={form.secondaryMuscle} options={toOptions(MUSCLES)}
                    onChange={(v) => set("secondaryMuscle", v)}
                />
                <MultiSelectField
                    label="필요 장비" required
                    selected={form.equipmentReq} options={toOptions(EQUIPMENT)}
                    onChange={(v) => set("equipmentReq", v)}
                />
                <MultiSelectField
                    label="통증 유발 부위" required
                    selected={form.painTriggers} options={toOptions(PAIN_PARTS)}
                    onChange={(v) => set("painTriggers", v)}
                />
                <MultiSelectField
                    label="대체 운동"
                    hint="선택 항목이에요. 주요근육이 같은 운동만 ID로 저장하고, 화면에는 한국어명으로 보여줘요."
                    selected={form.substituteExerciseIds}
                    options={substituteOptions}
                    onChange={(v) => set("substituteExerciseIds", v)}
                />
            </div>

            <div className="shrink-0 border-t border-hairline bg-ground px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <Button variant="primary" size="lg" block onClick={handleSave} loading={saving}>
                    {saving ? "저장 중" : "저장"}
                </Button>
            </div>

            <Sheet
                open={confirmDelete}
                onClose={() => {
                    if (!deleting) setConfirmDelete(false)
                }}
                title="운동을 삭제할까요?"
                description={`"${form.nameKr || form.nameEn}" 운동이 목록에서 사라져요. 되돌릴 수 없어요.`}
                footer={
                    <div className="flex flex-col gap-2">
                        <Button variant="danger" size="lg" block onClick={handleDelete} loading={deleting}>
                            삭제
                        </Button>
                        <Button variant="ghost" size="lg" block onClick={() => setConfirmDelete(false)} disabled={deleting}>
                            취소
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2">이 운동을 대체 운동으로 지정한 다른 운동이 있다면 함께 확인해 주세요.</p>
            </Sheet>
        </div>
    )
}

function ListView({
    exercises, loading, error,
    onNew, onSelect, onRetry,
}: {
    exercises: AdminExercise[]
    loading: boolean
    error: string | null
    onNew: () => void
    onSelect: (ex: AdminExercise) => void
    onRetry: () => void
}) {
    const [search, setSearch] = useState("")

    const filtered = exercises.filter((e) => {
        const q = search.toLowerCase()
        return (
            e.nameKr?.toLowerCase().includes(q) ||
            e.nameEn?.toLowerCase().includes(q) ||
            e.primaryMuscle?.toLowerCase().includes(q)
        )
    })

    const openExercise = (ex: AdminExercise) => {
        onSelect(ex)
    }

    const exerciseNameById = useMemo(
        () => new Map(exercises.map((exercise) => [String(exercise.id), exercise.nameKr || exercise.nameEn || String(exercise.id)])),
        [exercises],
    )

    const substituteNames = (ids: string | null) => {
        const values = toArr(ids)
        if (values.length === 0) return "-"
        return values.map((id) => exerciseNameById.get(id) ?? id).join(", ")
    }

    const th = "px-3 py-2.5 text-caption font-bold text-ink-2"
    const td = "truncate px-3 py-3 text-body-sm"

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b border-hairline bg-ground px-4 py-2">
                <h1 className="flex-1 text-title-sm font-bold text-ink">운동 데이터 관리</h1>
                <Button variant="primary" onClick={onNew} icon={<Plus className="size-4" aria-hidden />}>
                    새 운동
                </Button>
            </div>

            <div className="shrink-0 p-3">
                <label className="flex min-h-12 items-center gap-2 rounded-control border border-rail bg-ground px-3 focus-within:border-line-push">
                    <Search className="size-4 shrink-0 text-ink-2" aria-hidden />
                    <span className="sr-only">운동 검색</span>
                    <input
                        type="search" placeholder="이름 또는 근육으로 검색"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
                    />
                </label>
            </div>

            <div className="shrink-0 px-3 pb-1">
                {!loading && !error && <p className="text-caption text-ink-2" aria-live="polite">총 {filtered.length}건</p>}
            </div>
            <div className="mx-3 mb-4 min-h-0 flex-1 overflow-auto rounded-panel border border-hairline bg-ground">
                {loading && (
                    <div className="space-y-2 p-3" role="status" aria-label="불러오는 중">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                    </div>
                )}
                {error && !loading && (
                    <EmptyState
                        title="목록을 불러오지 못했어요"
                        body={error}
                        action={<Button variant="secondary" onClick={onRetry}>다시 시도</Button>}
                    />
                )}
                {!loading && !error && (
                    <table className="w-full min-w-[1120px] table-fixed text-left">
                        <thead>
                            <tr className="border-b border-hairline bg-surface">
                                <th scope="col" className={`w-16 ${th}`}>ID</th>
                                <th scope="col" className={`w-32 ${th}`}>한국어명</th>
                                <th scope="col" className={`w-40 ${th}`}>영어명</th>
                                <th scope="col" className={`w-32 ${th}`}>주요근육</th>
                                <th scope="col" className={`w-32 ${th}`}>운동유형</th>
                                <th scope="col" className={`w-44 ${th}`}>장비</th>
                                <th scope="col" className={`w-48 ${th}`}>대체 운동</th>
                                <th scope="col" className={`w-20 text-center ${th}`}>난이도</th>
                                <th scope="col" className={`w-20 text-center ${th}`}>효율</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-10 text-center text-body-sm text-ink-2">
                                        {search ? "검색 결과가 없어요." : "등록된 운동이 없어요."}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((ex) => (
                                    <tr
                                        key={ex.id}
                                        tabIndex={0}
                                        aria-label={`${ex.nameKr || ex.nameEn} 수정`}
                                        onClick={() => openExercise(ex)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault()
                                                openExercise(ex)
                                            }
                                        }}
                                        className="group cursor-pointer border-b border-hairline last:border-0 hover:bg-surface active:bg-hairline"
                                    >
                                        <td className={`${td} font-mono font-bold text-line-push underline-offset-2 group-hover:underline`}>{ex.id}</td>
                                        <td className={`${td} font-medium text-ink`}>{ex.nameKr}</td>
                                        <td className={`${td} text-ink-2`}>{ex.nameEn}</td>
                                        <td className={`${td} text-ink-2`}>{ex.primaryMuscle ?? "-"}</td>
                                        <td className={`${td} text-ink-2`}>{ex.movementType ?? "-"}</td>
                                        <td className={`${td} text-ink-2`}>{ex.equipmentReq ?? "-"}</td>
                                        <td className={`${td} text-ink-2`}>{substituteNames(ex.substituteExerciseIds)}</td>
                                        <td className={`${td} text-center text-ink`}>{ex.difficultyTier ?? "-"}</td>
                                        <td className={`${td} text-center text-ink`}>{ex.efficiencyTier ?? "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default function ExerciseAdminPage() {
    const router = useRouter()
    const [view, setView] = useState<PageView>("list")
    const [exercises, setExercises] = useState<AdminExercise[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setExercises(await exerciseAdminClient.getAll())
        } catch {
            setError("네트워크 상태를 확인하고 다시 시도해 주세요.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const handleSave = async (req: ExerciseRequest) => {
        if (view === "new") {
            const created = await exerciseAdminClient.create(req)
            setExercises((prev) => [created, ...prev])
        } else if (typeof view === "object") {
            const updated = await exerciseAdminClient.update(view.exercise.id, req)
            setExercises((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        }
        setView("list")
    }

    const handleDelete = async () => {
        if (typeof view !== "object") return
        await exerciseAdminClient.delete(view.exercise.id)
        setExercises((prev) => prev.filter((e) => e.id !== view.exercise.id))
        setView("list")
    }

    if (view === "list") {
        return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-ground">
                <div className="flex shrink-0 items-center gap-1 border-b border-hairline bg-ground px-2">
                    <button
                        type="button"
                        onClick={() => router.push("/admin")}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-body-sm text-ink-2 hover:bg-surface hover:text-ink"
                    >
                        <ArrowLeft className="size-4" aria-hidden />
                        관리자 대시보드
                    </button>
                </div>
                <ListView
                    exercises={exercises}
                    loading={loading}
                    error={error}
                    onNew={() => setView("new")}
                    onSelect={(ex) => setView({ type: "edit", exercise: ex })}
                    onRetry={load}
                />
            </div>
        )
    }

    return (
        <FormView
            initial={typeof view === "object" ? view.exercise : undefined}
            exercises={exercises}
            onBack={() => setView("list")}
            onSave={handleSave}
            onDelete={typeof view === "object" ? handleDelete : undefined}
        />
    )
}
