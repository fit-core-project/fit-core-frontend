"use client"

import React, { useEffect, useState } from "react"
import { UserResponse } from "@/types/project"
import { Gender } from "@/types/enums"
import ProfileService from "@/lib/api/profile/ProfileService"

interface ProfileEditFormProps {
    initialProfile: UserResponse | null
    onSave: (updateProfile: Partial<UserResponse>) => void
    onCancel: () => void
}

export default function ProfileEditForm({ initialProfile, onSave, onCancel }: ProfileEditFormProps) {
    const [formData, setFormData] = useState({
        name: initialProfile?.name || "",
        nickname: initialProfile?.nickname || "",
        gender: initialProfile?.gender || "NONE",
        birthDate: initialProfile?.birthDate ? String(initialProfile?.birthDate).split("T")[0] : "",
    })
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate">("idle")

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.nickname === initialProfile?.nickname || !formData.nickname) {
                setNicknameStatus("idle")
                return
            }

            setNicknameStatus("checking")

            try {
                const res = await ProfileService.checkNicknameDuplicate(formData.nickname)

                setNicknameStatus(res ? "duplicate" : "available")
            } catch (error) {
                console.error("중복 확인 에러", error)
                setNicknameStatus("idle")
            }
        }, 500)

        // 사용자가 계속 타이핑하면 이전 타이머 취소 (필수)
        return () => clearTimeout(timer)
    }, [formData.nickname, initialProfile?.nickname])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // 닉네임이 변경된 경우에만 최종 체크
        if (formData.nickname !== initialProfile?.nickname) {
            try {
                const res = await ProfileService.checkNicknameDuplicate(formData.nickname)
                if (res) {
                    setNicknameStatus("duplicate")
                    alert("이미 사용 중인 닉네임입니다. 다시 확인해 주세요.")
                    return // 여기서 중단
                }
            } catch (error) {
                alert("중복 확인 중 오류가 발생했습니다.")
                return
            }
        }

        // 최종 통과 시 저장 호출
        onSave(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
            {/* 이름 */}
            <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                    type="text"
                    value={formData.name}
                    readOnly
                    disabled
                    className="w-full mt-1 p-2 border rounded-md"
                />
            </div>

            {/* 닉네임 */}
            <div>
                <label className="block text-sm font-medium text-gray-700">닉네임</label>
                <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => {
                        // 1. 상태 업데이트
                        setFormData({ ...formData, nickname: e.target.value })
                    }}
                    className={`w-full mt-1 p-2 border rounded-md outline-none focus:ring-2 ${
                        nicknameStatus === "duplicate" ? "border-red-500 focus:ring-red-200" : "focus:ring-blue-200"
                    }`}
                    placeholder="닉네임을 입력하세요"
                />

                {/* 2. 상태에 따른 피드백 메시지 추가 */}
                <div className="mt-1 text-xs h-4">
                    {nicknameStatus === "checking" && <span className="text-gray-500">중복 확인 중...</span>}
                    {nicknameStatus === "available" && (
                        <span className="text-green-600">사용 가능한 닉네임입니다.</span>
                    )}
                    {nicknameStatus === "duplicate" && (
                        <span className="text-red-600">이미 사용 중인 닉네임입니다.</span>
                    )}
                </div>
            </div>

            {/* 성별 */}
            <div>
                <label className="block text-sm font-medium text-gray-700">성별</label>
                <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full mt-1 p-2 border rounded-md"
                >
                    <option value="MALE">남성</option>
                    <option value="FEMALE">여성</option>
                    <option value="NONE">선택안함</option>
                </select>
            </div>

            {/* 생년월일 */}
            <div>
                <label className="block text-sm font-medium text-gray-700">생년월일</label>
                <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-md"
                />
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-2 border rounded-md hover:bg-gray-50">
                    취소
                </button>
                <button
                    type="submit"
                    disabled={nicknameStatus === "duplicate" || nicknameStatus === "checking"}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
                >
                    저장
                </button>
            </div>
        </form>
    )
}
