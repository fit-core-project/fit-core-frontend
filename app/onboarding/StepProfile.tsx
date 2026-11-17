"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { Button, TextField, ToggleChip } from "@/components/ui"

const GENDER_OPTIONS = [
    { value: "MALE", label: "남성" },
    { value: "FEMALE", label: "여성" },
    { value: "NONE", label: "선택 안 함" },
] as const

interface Props {
    onNext: () => void
}

export default function StepProfile({ onNext }: Props) {
    const [nickname, setNickname] = useState("")
    const [gender, setGender] = useState<"MALE" | "FEMALE" | "NONE">("NONE")
    const [birthDate, setBirthDate] = useState("")
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "ok" | "dup" | "empty" | "error">("idle")
    const [checkAttempt, setCheckAttempt] = useState(0)
    const [saving, setSaving] = useState(false)
    // Display-only: the required message waits until the field was touched or 다음 was pressed.
    const [touched, setTouched] = useState(false)
    const [attempted, setAttempted] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // The account's own saved nickname (after a refresh or coming back to this step) is not a duplicate.
    const [savedNickname, setSavedNickname] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        profileApiClient
            .getMe()
            .then((profile) => {
                if (cancelled) return
                const saved = profile.nickname?.trim()
                if (saved) {
                    setSavedNickname(saved)
                    setNickname((current) => current || saved)
                }
                if (profile.gender === "MALE" || profile.gender === "FEMALE" || profile.gender === "NONE") {
                    const savedGender = profile.gender
                    setGender((current) => (current === "NONE" ? savedGender : current))
                }
                if (profile.birthDate) {
                    const savedBirthDate = profile.birthDate
                    setBirthDate((current) => current || savedBirthDate)
                }
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!nickname.trim()) {
            setNicknameStatus("empty")
            return
        }
        if (savedNickname && nickname.trim() === savedNickname) {
            setNicknameStatus("ok")
            return
        }
        setNicknameStatus("checking")
        debounceRef.current = setTimeout(() => {
            profileApiClient
                .isNicknameTaken(nickname.trim())
                .then((taken) => setNicknameStatus(taken ? "dup" : "ok"))
                .catch(() => setNicknameStatus("error"))
        }, 400)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [nickname, checkAttempt, savedNickname])

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
            setSavedNickname(nickname.trim())
            onNext()
        } catch {
            toast.error("프로필을 저장하지 못했어요. 잠시 후 다시 시도하세요.")
        } finally {
            setSaving(false)
        }
    }

    const showRequired = nicknameStatus === "empty" && (touched || attempted)
    const nicknameError =
        nicknameStatus === "dup"
            ? "이미 쓰이고 있는 닉네임이에요. 다른 닉네임을 입력하세요."
            : nicknameStatus === "error"
              ? "닉네임을 확인하지 못했어요. 아래 버튼으로 다시 확인하세요."
              : showRequired
                ? "닉네임을 입력하세요."
                : undefined
    const nicknameHint =
        nicknameStatus === "checking" ? "쓸 수 있는지 확인하고 있어요." : nicknameStatus === "ok" ? "사용할 수 있는 닉네임이에요." : "20자까지 쓸 수 있어요."

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-title font-bold text-ink">기본 정보를 알려주세요</h1>
                <p className="mt-1 text-body-sm text-ink-2">나중에 마이 페이지에서 바꿀 수 있어요.</p>
            </div>

            <div className="flex flex-col gap-5">
                <TextField
                    label="닉네임"
                    type="text"
                    value={nickname}
                    onChange={(e) => {
                        setTouched(true)
                        setNickname(e.target.value)
                    }}
                    onBlur={() => setTouched(true)}
                    placeholder="닉네임을 입력하세요"
                    maxLength={20}
                    autoComplete="nickname"
                    required
                    hint={nicknameHint}
                    error={nicknameError}
                />
                {nicknameStatus === "error" && (
                    <Button variant="secondary" className="self-start" onClick={() => setCheckAttempt((n) => n + 1)}>
                        다시 확인
                    </Button>
                )}

                <div className="flex flex-col gap-1.5">
                    <span id="onboarding-gender-label" className="text-body-sm font-medium text-ink">
                        성별<span className="ml-1 font-normal text-ink-2">(선택)</span>
                    </span>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="onboarding-gender-label">
                        {GENDER_OPTIONS.map((option) => (
                            <ToggleChip key={option.value} pressed={gender === option.value} onClick={() => setGender(option.value)}>
                                {option.label}
                            </ToggleChip>
                        ))}
                    </div>
                </div>

                <TextField label="생년월일" optional type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>

            <Button
                variant="primary"
                size="lg"
                block
                loading={saving}
                aria-disabled={!canProceed || undefined}
                className={!canProceed && !saving ? "opacity-40" : undefined}
                onClick={() => {
                    setAttempted(true)
                    void handleSave()
                }}
            >
                {saving ? "저장하고 있어요" : "다음"}
            </Button>
        </div>
    )
}
