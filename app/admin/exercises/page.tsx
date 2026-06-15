"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react"
import exerciseAdminClient, { AdminExercise, ExerciseRequest } from "@/lib/api/admin/exerciseAdminClient"
import { toast } from "sonner"

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

function SelectField({
    label, hint, value, options, onChange, required,
}: {
    label: string; hint?: string; value: string | number | null
    options: (string | number)[]; onChange: (v: string) => void; required?: boolean
}) {
    return (
        <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-600">
                {label}{required && <span className="ml-0.5 text-red-400">*</span>}
            </label>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            >
                <option value="">선택</option>
                {options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
            {hint && <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>}
        </div>
    )
}

function MultiSelectField({
    label, hint, selected, options, onChange, required,
}: {
    label: string; hint?: string; selected: string[]
    options: SelectOption[]; onChange: (v: string[]) => void; required?: boolean
}) {
    const toggle = (value: string) =>
        onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value])

    const labelByValue = new Map(options.map((option) => [option.value, option.label]))

    return (
        <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
                {label}{required && <span className="ml-0.5 text-red-400">*</span>}
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                {options.length === 0 && (
                    <p className="px-1 py-1 text-[11px] text-slate-400">선택 가능한 항목이 없습니다.</p>
                )}
                {options.map((item) => {
                    const active = selected.includes(item.value)
                    return (
                        <button
                            key={item.value} type="button" onClick={() => toggle(item.value)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                active
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300"
                                }`}
                        >
                            {item.label}
                        </button>
                    )
                })}
            </div>
            {hint && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{hint}</p>}
            {selected.length > 0 && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                    선택됨: {selected.map((value) => labelByValue.get(value) ?? value).join(", ")}
                </p>
            )}
        </div>
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
        } catch {
            toast.error("저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!onDelete) return
        if (!window.confirm(`"${form.nameKr}" 운동을 삭제하시겠습니까?`)) return
        try {
            setDeleting(true)
            await onDelete()
        } catch {
            toast.error("삭제 중 오류가 발생했습니다.")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="flex-1 text-base font-bold text-slate-900">
                    {isEdit ? "운동 수정" : "새 운동 추가"}
                </h2>
                {isEdit && (
                    <button
                        type="button" onClick={handleDelete} disabled={deleting}
                        className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                        <Trash2 size={13} />
                        삭제
                    </button>
                )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            한국어명<span className="ml-0.5 text-red-400">*</span>
                        </label>
                        <input
                            type="text" value={form.nameKr}
                            onChange={(e) => set("nameKr", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            영어명<span className="ml-0.5 text-red-400">*</span>
                        </label>
                        <input
                            type="text" value={form.nameEn}
                            onChange={(e) => set("nameEn", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        hint="1이 가장 낮은 진입 난이도입니다. 값이 커질수록 기술 요구도가 높습니다."
                        value={form.difficultyTier} options={DIFFICULTY_LEVELS}
                        onChange={(v) => set("difficultyTier", v === "" ? null : Number(v))}
                    />
                    <SelectField
                        label="효율성" required
                        hint="1이 가장 높은 효율입니다. 값이 커질수록 우선순위가 낮습니다."
                        value={form.efficiencyTier} options={EFFICIENCY_LEVELS}
                        onChange={(v) => set("efficiencyTier", v === "" ? null : Number(v))}
                    />
                </div>

                <MultiSelectField
                    label="보조근육"
                    hint="선택 항목입니다. 주동근 이외의 보조 동원 근육만 지정합니다."
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
                    hint="선택 항목입니다. 주요근육이 같은 운동만 ID로 저장하고, 화면에는 한국어명으로 표시합니다."
                    selected={form.substituteExerciseIds}
                    options={substituteOptions}
                    onChange={(v) => set("substituteExerciseIds", v)}
                />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
                <button
                    type="button" onClick={handleSave} disabled={saving}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    {saving ? "저장 중..." : "저장"}
                </button>
            </div>
        </div>
    )
}

function ListView({
    exercises, loading, error,
    onNew, onSelect,
}: {
    exercises: AdminExercise[]
    loading: boolean
    error: string | null
    onNew: () => void
    onSelect: (ex: AdminExercise) => void
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

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <h1 className="flex-1 text-base font-bold text-slate-900">운동 데이터 관리</h1>
                <button
                    type="button" onClick={onNew}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                    <Plus size={14} />
                    새 운동
                </button>
            </div>

            <div className="shrink-0 p-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Search size={15} className="shrink-0 text-slate-400" />
                    <input
                        type="text" placeholder="이름 또는 근육으로 검색..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="shrink-0 px-3 pb-1">
                {!loading && !error && <p className="text-xs text-slate-400">총 {filtered.length}건</p>}
            </div>
            <div className="mx-3 mb-4 min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
                {loading && <p className="py-12 text-center text-sm text-slate-400">불러오는 중...</p>}
                {error && <p className="py-12 text-center text-sm text-red-500">{error}</p>}
                {!loading && !error && (
                    <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="w-16 px-3 py-2.5 text-xs font-semibold text-slate-500">ID</th>
                                        <th className="w-32 px-3 py-2.5 text-xs font-semibold text-slate-500">한국어명</th>
                                        <th className="w-40 px-3 py-2.5 text-xs font-semibold text-slate-500">영어명</th>
                                        <th className="w-32 px-3 py-2.5 text-xs font-semibold text-slate-500">주요근육</th>
                                        <th className="w-32 px-3 py-2.5 text-xs font-semibold text-slate-500">운동유형</th>
                                        <th className="w-44 px-3 py-2.5 text-xs font-semibold text-slate-500">장비</th>
                                        <th className="w-48 px-3 py-2.5 text-xs font-semibold text-slate-500">대체 운동</th>
                                        <th className="w-20 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">난이도</th>
                                        <th className="w-20 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">효율</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((ex) => (
                                            <tr
                                                key={ex.id}
                                                tabIndex={0}
                                                onClick={() => openExercise(ex)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault()
                                                        openExercise(ex)
                                                    }
                                                }}
                                                className="group cursor-pointer border-b border-slate-50 last:border-0 hover:bg-emerald-50 active:bg-emerald-100"
                                            >
                                                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-emerald-700 underline-offset-2 group-hover:underline">{ex.id}</td>
                                                <td className="truncate px-3 py-2.5 font-medium text-slate-800">{ex.nameKr}</td>
                                                <td className="truncate px-3 py-2.5 text-slate-600">{ex.nameEn}</td>
                                                <td className="truncate px-3 py-2.5 text-slate-500">{ex.primaryMuscle ?? "-"}</td>
                                                <td className="truncate px-3 py-2.5 text-slate-500">{ex.movementType ?? "-"}</td>
                                                <td className="truncate px-3 py-2.5 text-xs text-slate-400">{ex.equipmentReq ?? "-"}</td>
                                                <td className="truncate px-3 py-2.5 text-xs text-slate-500">{substituteNames(ex.substituteExerciseIds)}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-600">{ex.difficultyTier ?? "-"}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-600">{ex.efficiencyTier ?? "-"}</td>
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
            setError("운동 데이터를 불러오지 못했습니다.")
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
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
                    <button type="button" onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
                        <ArrowLeft size={16} />
                    </button>
                    <span className="text-xs text-slate-400">관리자 대시보드</span>
                </div>
                <ListView
                    exercises={exercises}
                    loading={loading}
                    error={error}
                    onNew={() => setView("new")}
                    onSelect={(ex) => setView({ type: "edit", exercise: ex })}
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
