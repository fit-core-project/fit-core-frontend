"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import dietApiClient from "@/lib/api/diet/dietApiClient"
import type { DietLogRequest, DietLogResponse } from "@/types/project"

interface Props {
    onClose: () => void
    onSaved: () => void
    editItem?: DietLogResponse
    defaultDate?: string
}

const INPUT_CLS =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
const SELECT_CLS = `${INPUT_CLS} appearance-none cursor-pointer`

function getKstDate(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function getKstTime(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16)
}

function computePreviewKcal(protein: string, carbs: string, fat: string): number | null {
    const p = parseFloat(protein)
    const c = parseFloat(carbs)
    const f = parseFloat(fat)
    if (isNaN(p) && isNaN(c) && isNaN(f)) return null
    return Math.round((isNaN(p) ? 0 : p) * 4 + (isNaN(c) ? 0 : c) * 4 + (isNaN(f) ? 0 : f) * 9)
}

export default function ManualEntryModal({ onClose, onSaved, editItem, defaultDate }: Props) {
    const isEdit = !!editItem
    const [foodName, setFoodName] = useState(editItem?.foodName ?? "")
    const [mealType, setMealType] = useState(editItem?.mealType ?? "")
    const [loggedAt, setLoggedAt] = useState(() =>
        editItem?.loggedAt ? editItem.loggedAt.slice(11, 16) : getKstTime()
    )
    const [amountRaw, setAmountRaw] = useState(editItem?.amountRaw ?? "")
    const [amountG, setAmountG] = useState(editItem?.amountG != null ? String(editItem.amountG) : "")
    const [protein, setProtein] = useState(editItem?.proteinG != null ? String(editItem.proteinG) : "")
    const [carbs, setCarbs] = useState(editItem?.carbsG != null ? String(editItem.carbsG) : "")
    const [fat, setFat] = useState(editItem?.fatG != null ? String(editItem.fatG) : "")
    const [kcal, setKcal] = useState(editItem?.kcal != null ? String(editItem.kcal) : "")
    const [isSaving, setIsSaving] = useState(false)
    const [validationMsg, setValidationMsg] = useState("")
    const foodNameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        foodNameRef.current?.focus()
    }, [])

    const previewKcal = computePreviewKcal(protein, carbs, fat)
    const hasMacro = protein !== "" || carbs !== "" || fat !== ""
    const hasKcal = kcal !== ""
    const canSave = foodName.trim() !== "" && (hasMacro || hasKcal)

    const buildReq = (): DietLogRequest => ({
        logDate: editItem?.logDate ?? defaultDate ?? getKstDate(),
        mealType: mealType || null,
        loggedAt: loggedAt || null,
        foodName: foodName.trim(),
        amountRaw: amountRaw.trim() || null,
        amountG: amountG !== "" ? parseFloat(amountG) : null,
        proteinG: protein !== "" ? parseFloat(protein) : null,
        carbsG: carbs !== "" ? parseFloat(carbs) : null,
        fatG: fat !== "" ? parseFloat(fat) : null,
        kcal: kcal !== "" ? Math.round(parseFloat(kcal)) : null,
        source: "manual",
    })

    const handleSave = async () => {
        if (!foodName.trim()) {
            setValidationMsg("음식명을 입력해 주세요.")
            return
        }
        if (!hasMacro && !hasKcal) {
            setValidationMsg("매크로(단백질·탄수화물·지방) 또는 칼로리 중 하나를 입력해 주세요.")
            return
        }
        setValidationMsg("")
        setIsSaving(true)

        try {
            if (isEdit) {
                await dietApiClient.update(editItem!.id, buildReq())
                toast.success("식단이 수정되었습니다.")
            } else {
                await dietApiClient.save([buildReq()])
                toast.success("식단이 저장되었습니다.")
            }
            onSaved()
            onClose()
        } catch {
            toast.error(isEdit ? "수정 중 오류가 발생했습니다." : "저장 중 오류가 발생했습니다.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!editItem) return
        if (!window.confirm("이 항목을 삭제하시겠습니까?")) return
        setIsSaving(true)
        try {
            await dietApiClient.delete(editItem.id)
            toast.success("삭제되었습니다.")
            onSaved()
            onClose()
        } catch {
            toast.error("삭제 중 오류가 발생했습니다.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
                style={{ maxHeight: "90dvh" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800">{isEdit ? "식단 수정" : "식단 직접 입력"}</h2>
                    <div className="flex items-center gap-3">
                        {!isEdit && (
                            <Link
                                href="/ai_quicklog"
                                className="flex items-center gap-1 text-xs font-semibold text-blue-600"
                            >
                                <Sparkles size={13} />
                                AI로 식단 기록
                            </Link>
                        )}
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* 음식명 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">음식명 *</label>
                        <input
                            ref={foodNameRef}
                            type="text"
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                            placeholder="예: 닭가슴살 샐러드"
                            className={INPUT_CLS}
                        />
                    </div>

                    {/* 끼니 + 시간 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">끼니</label>
                            <select
                                value={mealType}
                                onChange={(e) => setMealType(e.target.value)}
                                className={SELECT_CLS}
                            >
                                <option value="">선택 안 함</option>
                                <option value="breakfast">아침</option>
                                <option value="lunch">점심</option>
                                <option value="dinner">저녁</option>
                                <option value="snack">간식</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">시간</label>
                            <input
                                type="time"
                                value={loggedAt}
                                onChange={(e) => setLoggedAt(e.target.value)}
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>

                    {/* 양 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">양 (자유 입력)</label>
                            <input
                                type="text"
                                value={amountRaw}
                                onChange={(e) => setAmountRaw(e.target.value)}
                                placeholder="예: 200g / 1공기"
                                className={INPUT_CLS}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">양 (그램)</label>
                            <input
                                type="number"
                                value={amountG}
                                onChange={(e) => setAmountG(e.target.value)}
                                placeholder="200"
                                min={0}
                                max={5000}
                                step={0.1}
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>

                    {/* 매크로 */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <p className="mb-3 text-xs font-semibold text-slate-500">매크로 (g, 선택사항)</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-400">단백질</label>
                                <input
                                    type="number"
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value)}
                                    placeholder="0.0"
                                    min={0}
                                    max={1000}
                                    step={0.1}
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-400">탄수화물</label>
                                <input
                                    type="number"
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value)}
                                    placeholder="0.0"
                                    min={0}
                                    max={1000}
                                    step={0.1}
                                    className={INPUT_CLS}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-400">지방</label>
                                <input
                                    type="number"
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value)}
                                    placeholder="0.0"
                                    min={0}
                                    max={1000}
                                    step={0.1}
                                    className={INPUT_CLS}
                                />
                            </div>
                        </div>
                        {previewKcal !== null && (
                            <p className="mt-2 text-[11px] text-slate-400">
                                예상 kcal:{" "}
                                <span className="font-bold text-slate-600">{previewKcal}</span>
                                <span className="ml-1">(4·4·9 자동 계산 — 아래 직접 입력 시 해당 값 우선)</span>
                            </p>
                        )}
                    </div>

                    {/* kcal 직접 입력 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500">칼로리 직접 입력 (선택사항)</label>
                        <input
                            type="number"
                            value={kcal}
                            onChange={(e) => setKcal(e.target.value)}
                            placeholder="예: 350"
                            min={0}
                            max={5000}
                            className={INPUT_CLS}
                        />
                        <p className="text-[11px] text-slate-400">비워두면 매크로 기반으로 자동 계산됩니다.</p>
                    </div>

                    {/* 유효성 메시지 */}
                    {validationMsg && <p className="text-xs font-semibold text-red-500">{validationMsg}</p>}

                    {/* 저장 */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !canSave}
                        className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? "처리 중..." : isEdit ? "수정하기" : "저장하기"}
                    </button>

                    {/* 삭제 (편집 모드만) */}
                    {isEdit && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            삭제
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
