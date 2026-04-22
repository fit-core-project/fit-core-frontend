"use client"

import React, { useEffect, useState } from "react"
import { UserResponse } from "@/types/project"
import { GoalType, SplitType, ExperienceLevel, Gender } from "@/types/enums"
import ProfileService from "@/lib/api/profile/ProfileService"

// 1. 타입을 순회하기 위한 상수 배열 정의
const GOAL_OPTIONS: GoalType[] = ["strength", "hypertrophy", "fatLoss", "recomposition", "generalFitness"]
const SPLIT_OPTIONS: SplitType[] = ["fullBody", "upperLower", "pushPullLegs", "bodyPartSplit", "custom"]
const EXP_OPTIONS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"]
const GENDER_OPTIONS: Gender[] = ["MALE", "FEMALE", "NONE"]

interface ProfileEditFormProps {
    initialProfile: UserResponse | null
    onSave: (updateProfile: any) => void
    onCancel: () => void
}

export default function ProfileEditForm({ initialProfile, onSave, onCancel }: ProfileEditFormProps) {
    const [formData, setFormData] = useState({
        name: initialProfile?.name || "",
        nickname: initialProfile?.nickname || "",
        gender: initialProfile?.gender || "NONE",
        birthDate: initialProfile?.birthDate ? String(initialProfile?.birthDate).split("T")[0] : "",
        notes: initialProfile?.notes || "", // 추가된 필드
        goalType: initialProfile?.goalType || "strength",
        splitType: initialProfile?.splitType || "fullBody",
        experienceLevel: initialProfile?.experienceLevel || "beginner",
        trainingDaysPerWeek: initialProfile?.trainingDaysPerWeek || 3,
        bodyWeightKg: initialProfile?.bodyWeightKg || 0,
        bodyFatPct: initialProfile?.bodyFatPct || 0,
        splitLabel: initialProfile?.splitLabel || "",
    })

    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate">("idle")

    // 닉네임 체크 (기존 유지)
    useEffect(() => {
        const timer = setTimeout(async () => {
            // 공백을 제거한 값을 생성
            const trimmedNickname = formData.nickname.trim()

            // 1. 기존 닉네임과 같거나 (변경 없음)
            // 2. 공백만 입력했거나 빈 값일 경우 (trimmedNickname === "")
            // 체크를 수행하지 않고 idle 상태로 유지
            if (trimmedNickname === initialProfile?.nickname || trimmedNickname === "") {
                setNicknameStatus("idle")
                return
            }

            setNicknameStatus("checking")
            try {
                // API 호출 시에도 trim된 값을 보내는 것이 더 안전합니다
                const res = await ProfileService.checkNicknameDuplicate(trimmedNickname)
                setNicknameStatus(res ? "duplicate" : "available")
            } catch (error) {
                setNicknameStatus("idle")
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [formData.nickname, initialProfile?.nickname])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // 1. 필수 입력 체크 (공백 제거 후 체크)
        if (!formData.nickname || formData.nickname.trim() === "") {
            alert("닉네임을 입력해주세요.")
            return
        }

        // 2. 닉네임이 변경된 경우에만 최종 중복 체크
        if (formData.nickname !== initialProfile?.nickname) {
            try {
                const res = await ProfileService.checkNicknameDuplicate(formData.nickname)
                if (res) {
                    setNicknameStatus("duplicate")
                    alert("이미 사용 중인 닉네임입니다. 다시 확인해 주세요.")
                    return
                }
            } catch (error) {
                alert("중복 확인 중 오류가 발생했습니다.")
                return
            }
        }

        // 3. 최종 통과 시 저장
        onSave(formData)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target

        // input type이 number면 숫자로 변환, 아니면 문자열 그대로 저장
        const finalValue = type === "number" ? (value === "" ? 0 : parseFloat(value)) : value

        setFormData((prev) => ({ ...prev, [name]: finalValue }))
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm space-y-8">
            <section>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">기본 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">닉네임</label>
                        <input
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700">생년월일</label>
                        <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">성별</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        >
                            {GENDER_OPTIONS.map((g) => (
                                <option key={g} value={g}>
                                    {g === "NONE" ? "선택안함" : g}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">피트니스 상세 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 셀렉트 박스들: 상수 배열 사용 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">운동 목표</label>
                        <select
                            name="goalType"
                            value={formData.goalType}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        >
                            {GOAL_OPTIONS.map((val) => (
                                <option key={val} value={val}>
                                    {val}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">분할 방식</label>
                        <select
                            name="splitType"
                            value={formData.splitType}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        >
                            {SPLIT_OPTIONS.map((val) => (
                                <option key={val} value={val}>
                                    {val}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">운동 경력</label>
                        <select
                            name="experienceLevel"
                            value={formData.experienceLevel}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        >
                            {EXP_OPTIONS.map((val) => (
                                <option key={val} value={val}>
                                    {val}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 숫자 입력 필드 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">주당 운동 횟수</label>
                        <input
                            type="number"
                            name="trainingDaysPerWeek"
                            value={formData.trainingDaysPerWeek}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">체중 (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="bodyWeightKg"
                            value={formData.bodyWeightKg}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">체지방률 (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="bodyFatPct"
                            value={formData.bodyFatPct}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                </div>
            </section>

            <section>
                <label className="block text-sm font-medium text-gray-700 mb-2">기타 메모</label>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-2 border rounded-md"
                    placeholder="특이사항이나 메모를 입력하세요"
                />
            </section>

            <div className="flex gap-3 pt-4 border-t">
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
