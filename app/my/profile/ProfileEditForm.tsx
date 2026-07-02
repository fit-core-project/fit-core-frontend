"use client"

import React, { useEffect, useState } from "react"
import { ChevronDown, User } from "lucide-react"
import { useForm } from "react-hook-form"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { useSettingsStore } from "@/store/settingsStore"
import type { UserResponse } from "@/types/project"
import { NUMERIC_RANGES, numericRules, toDisplayBound } from "@/utils/numericValidation"

const GENDER_OPTIONS: { label: string; value: UserResponse["gender"] }[] = [
    { label: "남성", value: "MALE" },
    { label: "여성", value: "FEMALE" },
    { label: "선택 안 함", value: "NONE" },
]

const INPUT_CLS =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
const SELECT_CLS = `${INPUT_CLS} appearance-none cursor-pointer`

interface ProfileEditFormProps {
    initialProfile: UserResponse | null
    onSave: (updateProfile: Partial<UserResponse>) => void
    onCancel: () => void
}

export default function ProfileEditForm({ initialProfile, onSave, onCancel }: ProfileEditFormProps) {
    const { weightUnit } = useSettingsStore()
    const [formData, setFormData] = useState({
        nickname: initialProfile?.nickname || "",
        gender: initialProfile?.gender || "NONE",
        birthDate: initialProfile?.birthDate ? String(initialProfile.birthDate).split("T")[0] : "",
        bodyWeightKg: initialProfile?.bodyWeightKg || 0,
        bodyFatPct: initialProfile?.bodyFatPct || 0,
    })
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate">("idle")
    const {
        register,
        trigger,
        formState: { errors },
    } = useForm<Record<string, unknown>>({ mode: "onChange" })

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            const trimmedNickname = formData.nickname.trim()
            if (trimmedNickname === initialProfile?.nickname || trimmedNickname === "") {
                setNicknameStatus("idle")
                return
            }

            setNicknameStatus("checking")
            try {
                const isDuplicate = await profileApiClient.checkNickname(trimmedNickname)
                setNicknameStatus(isDuplicate ? "duplicate" : "available")
            } catch {
                setNicknameStatus("idle")
            }
        }, 500)

        return () => window.clearTimeout(timer)
    }, [formData.nickname, initialProfile?.nickname])

    const bodyFatPctRegister = register("bodyFatPct", numericRules("bodyFatPct"))
    const bodyWeightRegister = register("bodyWeightKg", numericRules("bodyWeightKg", weightUnit))

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        const nickname = formData.nickname.trim()
        if (!nickname) {
            setNicknameStatus("duplicate")
            return
        }
        if (nicknameStatus === "checking" || nicknameStatus === "duplicate") return

        const isValid = await trigger()
        if (!isValid) return

        if (nickname !== initialProfile?.nickname) {
            try {
                const isDuplicate = await profileApiClient.checkNickname(nickname)
                if (isDuplicate) {
                    setNicknameStatus("duplicate")
                    return
                }
            } catch {
                return
            }
        }

        onSave({
            nickname,
            gender: formData.gender as UserResponse["gender"],
            birthDate: formData.birthDate,
            bodyWeightKg: formData.bodyWeightKg,
            bodyFatPct: formData.bodyFatPct,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-4">
            <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-800">기본 정보</h2>
                </div>

                <div className="space-y-3">
                    <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">닉네임</span>
                        <input
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleChange}
                            className={INPUT_CLS}
                            placeholder="사용자 닉네임"
                        />
                        <span className="block h-4 text-xs">
                            {nicknameStatus === "checking" && <span className="text-slate-400">중복 확인 중...</span>}
                            {nicknameStatus === "available" && <span className="text-green-600">사용 가능한 닉네임입니다.</span>}
                            {nicknameStatus === "duplicate" && <span className="text-red-600">이미 사용 중인 닉네임입니다.</span>}
                        </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold text-slate-500">생년월일</span>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className={INPUT_CLS}
                            />
                        </label>

                        <label className="block space-y-1">
                            <span className="text-xs font-semibold text-slate-500">성별</span>
                            <span className="relative block">
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className={SELECT_CLS}
                                >
                                    {GENDER_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </span>
                        </label>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-base font-bold text-slate-800">신체 정보</h2>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">체중 ({weightUnit})</span>
                        <input
                            type="number"
                            name="bodyWeightKg"
                            min={toDisplayBound(NUMERIC_RANGES.bodyWeightKg.min, weightUnit)}
                            max={toDisplayBound(NUMERIC_RANGES.bodyWeightKg.max, weightUnit)}
                            step={NUMERIC_RANGES.bodyWeightKg.step}
                            value={
                                formData.bodyWeightKg
                                    ? weightUnit === "lbs"
                                        ? +(formData.bodyWeightKg * 2.20462).toFixed(1)
                                        : formData.bodyWeightKg
                                    : ""
                            }
                            onChange={(event) => {
                                bodyWeightRegister.onChange(event)
                                const raw = parseFloat(event.target.value)
                                const inKg = Number.isNaN(raw) ? 0 : weightUnit === "lbs" ? raw / 2.20462 : raw
                                setFormData((prev) => ({ ...prev, bodyWeightKg: inKg }))
                                void trigger("bodyWeightKg")
                            }}
                            className={INPUT_CLS}
                        />
                        {errors.bodyWeightKg?.message && (
                            <p className="text-xs text-red-600">{String(errors.bodyWeightKg.message)}</p>
                        )}
                    </label>

                    <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">체지방률 (%)</span>
                        <input
                            type="number"
                            name="bodyFatPct"
                            min={NUMERIC_RANGES.bodyFatPct.min}
                            max={NUMERIC_RANGES.bodyFatPct.max}
                            step={NUMERIC_RANGES.bodyFatPct.step}
                            value={String(formData.bodyFatPct)}
                            onChange={(event) => {
                                bodyFatPctRegister.onChange(event)
                                setFormData((prev) => ({ ...prev, bodyFatPct: Number(event.target.value) || 0 }))
                                void trigger("bodyFatPct")
                            }}
                            className={INPUT_CLS}
                        />
                        {errors.bodyFatPct?.message && (
                            <p className="text-xs text-red-600">{String(errors.bodyFatPct.message)}</p>
                        )}
                    </label>
                </div>
            </section>

            <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/95 px-4 pb-4 pt-3 backdrop-blur-sm">
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={nicknameStatus === "duplicate" || nicknameStatus === "checking"}
                        className="flex-[2] rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-50"
                    >
                        저장하기
                    </button>
                </div>
            </div>
        </form>
    )
}
