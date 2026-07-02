"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import profileApiClient from "@/lib/api/profile/profileApiClient"

const INPUT_CLS =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"

interface Props {
    onNext: () => void
}

export default function StepProfile({ onNext }: Props) {
    const [nickname, setNickname] = useState("")
    const [gender, setGender] = useState<"MALE" | "FEMALE" | "NONE">("NONE")
    const [birthDate, setBirthDate] = useState("")
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "ok" | "dup" | "empty">("idle")
    const [saving, setSaving] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!nickname.trim()) {
            setNicknameStatus("empty")
            return
        }
        setNicknameStatus("checking")
        debounceRef.current = setTimeout(() => {
            profileApiClient
                .checkNickname(nickname.trim())
                .then((available) => setNicknameStatus(available ? "ok" : "dup"))
                .catch(() => setNicknameStatus("idle"))
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [nickname])

    const canProceed = nicknameStatus === "ok" && !saving

    const handleSave = async () => {
        if (!canProceed) return
        setSaving(true)
        try {
            await profileApiClient.updateMe({
                nickname: nickname.trim(),
                gender,
                birthDate: birthDate || undefined,
            })
            onNext()
        } catch {
            toast.error("프로필 저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">기본 정보를 입력해주세요</h2>
                <p className="mt-1 text-sm text-slate-500">나중에 마이페이지에서 수정할 수 있어요.</p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">닉네임 *</label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임을 입력하세요"
                        maxLength={20}
                        className={INPUT_CLS}
                    />
                    {nicknameStatus === "checking" && (
                        <p className="text-xs text-slate-400">확인 중...</p>
                    )}
                    {nicknameStatus === "ok" && (
                        <p className="text-xs text-emerald-600">사용 가능한 닉네임입니다.</p>
                    )}
                    {nicknameStatus === "dup" && (
                        <p className="text-xs text-red-500">이미 사용 중인 닉네임입니다.</p>
                    )}
                    {nicknameStatus === "empty" && nickname === "" && (
                        <p className="text-xs text-slate-400">닉네임은 필수입니다.</p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">성별 (선택)</span>
                    <div className="flex gap-2">
                        {(["MALE", "FEMALE", "NONE"] as const).map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setGender(g)}
                                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                                    gender === g
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                }`}
                            >
                                {g === "MALE" ? "남성" : g === "FEMALE" ? "여성" : "선택 안함"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">생년월일 (선택)</label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className={INPUT_CLS}
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={handleSave}
                disabled={!canProceed}
                className="mt-2 w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
            >
                {saving ? "저장 중..." : "다음"}
            </button>
        </div>
    )
}
