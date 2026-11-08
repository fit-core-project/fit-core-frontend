"use client"

import React, { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import type { UserResponse } from "@/types/project"
import { Button, ButtonLink, Section, Surface, TextField } from "@/components/ui"

const GENDER_OPTIONS: { label: string; value: UserResponse["gender"] }[] = [
    { label: "남성", value: "MALE" },
    { label: "여성", value: "FEMALE" },
    { label: "선택 안 함", value: "NONE" },
]

const SELECT_CLS =
    "min-h-12 w-full cursor-pointer appearance-none rounded-control border border-rail bg-ground px-3 pr-10 text-body text-ink transition-[border-color] duration-150 hover:border-ink-3"

interface ProfileEditFormProps {
    initialProfile: UserResponse | null
    onSave: (updateProfile: Partial<UserResponse>) => void
    onCancel: () => void
}

export default function ProfileEditForm({ initialProfile, onSave, onCancel }: ProfileEditFormProps) {
    const [formData, setFormData] = useState({
        nickname: initialProfile?.nickname || "",
        gender: initialProfile?.gender || "NONE",
        birthDate: initialProfile?.birthDate ? String(initialProfile.birthDate).split("T")[0] : "",
    })
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate">("idle")

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            const trimmedNickname = formData.nickname.trim()
            if (trimmedNickname === initialProfile?.nickname || trimmedNickname === "") {
                setNicknameStatus("idle")
                return
            }

            setNicknameStatus("checking")
            try {
                const isDuplicate = await profileApiClient.isNicknameTaken(trimmedNickname)
                setNicknameStatus(isDuplicate ? "duplicate" : "available")
            } catch {
                setNicknameStatus("idle")
            }
        }, 500)

        return () => window.clearTimeout(timer)
    }, [formData.nickname, initialProfile?.nickname])

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

        if (nickname !== initialProfile?.nickname) {
            try {
                const isDuplicate = await profileApiClient.isNicknameTaken(nickname)
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
        })
    }

    const nicknameHint =
        nicknameStatus === "checking" ? "중복을 확인하고 있어요." : nicknameStatus === "available" ? "사용할 수 있는 닉네임이에요." : undefined
    const nicknameError =
        nicknameStatus !== "duplicate"
            ? undefined
            : formData.nickname.trim() === ""
              ? "닉네임을 입력하세요."
              : "이미 쓰이고 있는 닉네임이에요. 다른 닉네임을 입력하세요."

    return (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8 py-2">
            <Section title="기본 정보">
                <div className="flex flex-col gap-4">
                    <TextField
                        label="닉네임"
                        name="nickname"
                        value={formData.nickname}
                        onChange={handleChange}
                        placeholder="사용자 닉네임"
                        autoComplete="nickname"
                        hint={nicknameHint}
                        error={nicknameError}
                    />

                    <TextField label="생년월일" type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} optional />

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="profile-gender" className="text-body-sm font-medium text-ink">
                            성별
                        </label>
                        <div className="relative">
                            <select id="profile-gender" name="gender" value={formData.gender} onChange={handleChange} className={SELECT_CLS}>
                                {GENDER_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2" aria-hidden />
                        </div>
                    </div>
                </div>
            </Section>

            <Section title="체성분">
                <Surface tone="sunken" className="flex flex-col gap-3">
                    <p className="text-body-sm text-ink-2">체중과 체지방률은 시간에 따라 바뀌어서 통계 탭의 체성분 변화에서 기록해요.</p>
                    <ButtonLink href="/my?tab=stats" variant="secondary" className="self-start">
                        체성분 기록하기
                    </ButtonLink>
                </Surface>
            </Section>

            <div className="sticky bottom-0 -mx-4 border-t border-hairline bg-ground px-4 pb-4 pt-3">
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" size="lg" onClick={onCancel}>
                        취소
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="col-span-2"
                        disabled={nicknameStatus === "duplicate" || nicknameStatus === "checking"}
                    >
                        저장하기
                    </Button>
                </div>
            </div>
        </form>
    )
}
