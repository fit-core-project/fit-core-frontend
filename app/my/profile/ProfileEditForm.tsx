"use client"

import React, { useEffect, useState } from "react"
import { UserResponse } from "@/types/project"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { Activity, Bandage, Calendar, ChevronDown, Dumbbell, User } from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel"

// 1. 타입을 순회하기 위한 상수 배열 정의
const GOAL_OPTIONS: { label: string; value: string }[] = [
    { label: "근력 강화", value: "strength" },
    { label: "근비대", value: "hypertrophy" },
    { label: "체지방 감량", value: "fatLoss" },
    { label: "바디 리컴포지션", value: "recomposition" },
    { label: "건강 유지", value: "generalFitness" },
]

const SPLIT_OPTIONS: { label: string; value: string }[] = [
    { label: "전신", value: "fullBody" },
    { label: "상/하체 분할", value: "upperLower" },
    { label: "PPL (밀기/당기기/하체)", value: "pushPullLegs" },
    { label: "부위별 분할", value: "bodyPartSplit" },
    { label: "직접 설정", value: "custom" },
]

const EXP_OPTIONS: { label: string; value: string }[] = [
    { label: "초급", value: "beginner" },
    { label: "중급", value: "intermediate" },
    { label: "상급", value: "advanced" },
]

const GENDER_OPTIONS: { label: string; value: string }[] = [
    { label: "남성", value: "MALE" },
    { label: "여성", value: "FEMALE" },
    { label: "선택 안 함", value: "NONE" },
]

const EQUIPMENTS: { label: string; value: string }[] = [
    { label: "바벨", value: "BARBELL" },
    { label: "덤벨", value: "DUMBBELL" },
    { label: "머신", value: "MACHINE" },
    { label: "케이블", value: "CABLE" },
    { label: "맨몸", value: "BODYWEIGHT" },
]

const DAYS_OF_WEEK = [
    { label: "월", value: "MON" },
    { label: "화", value: "TUE" },
    { label: "수", value: "WED" },
    { label: "목", value: "THU" },
    { label: "금", value: "FRI" },
    { label: "토", value: "SAT" },
    { label: "일", value: "SUN" },
]

const PAIN_AREA_LABELS: Record<string, string> = {
    quadriceps: "허벅지 앞",
    hamstring: "햄스트링",
    gluteal: "둔근",
    trapezius: "승모근",
    "upper-back": "등(상부)",
    "lower-back": "허리",
    adductor: "내전근",
    knees: "무릎",
    "right-soleus": "오른 가자미근",
    "left-soleus": "왼쪽 가자미근",
    calves: "종아리",
    triceps: "삼두근",
    "back-deltoids": "후면 삼각근",
    forearm: "전완근",
    head: "머리",
    neck: "목",
    chest: "가슴",
    "front-deltoids": "전면 삼각근",
    biceps: "이두근",
    abs: "복근",
    obliques: "옆구리",
    abductors: "외전근",
}

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
        notes: initialProfile?.notes || "", // 추가된 필드
        goalType: initialProfile?.goalType || "strength",
        splitType: initialProfile?.splitType || "fullBody",
        experienceLevel: initialProfile?.experienceLevel || "beginner",
        trainingDaysPerWeek: initialProfile?.trainingDaysPerWeek || 3,
        bodyWeightKg: initialProfile?.bodyWeightKg || 0,
        bodyFatPct: initialProfile?.bodyFatPct || 0,
        splitLabel: initialProfile?.splitLabel || "",
        availableDays: initialProfile?.availableDays || [],
        equipmentAccess: initialProfile?.equipmentAccess || [],
        painAreas: initialProfile?.painAreas || [],
    })
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate">("idle")
    const [domsData, setDomsData] = useState<Record<string, number>>(() => {
        if (!initialProfile?.painAreas) return {}
        return initialProfile.painAreas.reduce(
            (acc, curr) => {
                acc[curr.area] = 1
                return acc
            },
            {} as Record<string, number>
        )
    })
    const [isExpanded, setIsExpanded] = useState(true)

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
                const res = await profileApiClient.checkNickname(trimmedNickname)
                setNicknameStatus(res ? "duplicate" : "available")
            } catch {
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
                const res = await profileApiClient.checkNickname(formData.nickname)
                if (res) {
                    setNicknameStatus("duplicate")
                    alert("이미 사용 중인 닉네임입니다. 다시 확인해 주세요.")
                    return
                }
            } catch {
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

    const handleEquipmentToggle = (value: string) => {
        setFormData((prev) => {
            // 1. 현재 선택된 장비 목록을 가져옵니다.
            const currentList = prev.equipmentAccess

            // 2. 이미 포함되어 있는지 확인합니다.
            const isSelected = currentList.includes(value)

            return {
                ...prev,
                equipmentAccess: isSelected
                    ? currentList.filter((item) => item !== value) // 이미 있다면 제거
                    : [...currentList, value], // 없다면 추가
            }
        })
    }

    const handleDayToggle = (day: string) => {
        setFormData((prev) => {
            // 1. 이미 선택된 요일인지 확인
            const isSelected = prev.availableDays.includes(day)

            return {
                ...prev,
                availableDays: isSelected
                    ? prev.availableDays.filter((d) => d !== day) // 이미 있다면 제거
                    : [...prev.availableDays, day], // 없다면 추가
            }
        })
    }

    const handleMuscleClick = (muscleName: string) => {
        // 1. domsData (UI 상태) 먼저 업데이트
        setDomsData((prev) => {
            const newData = { ...prev }
            const isSelected = !!newData[muscleName]

            if (isSelected) {
                delete newData[muscleName]
            } else {
                newData[muscleName] = 1
            }
            return newData
        })

        // 2. formData (서버 전송 상태) 업데이트
        setFormData((prev) => {
            // 현재 상태(prev)를 기반으로 이미 존재하는지 확인
            const exists = prev.painAreas.some((p) => p.area === muscleName)

            if (exists) {
                // 이미 있다면 -> 제거 (토글 방식)
                return {
                    ...prev,
                    painAreas: prev.painAreas.filter((p) => p.area !== muscleName),
                }
            } else {
                // 없다면 -> 안전하게 추가
                // 혹시 모르니 여기서도 filter를 한번 더 해서 이중 추가 방지
                const cleanList = prev.painAreas.filter((p) => p.area !== muscleName)
                return {
                    ...prev,
                    painAreas: [...cleanList, { area: muscleName, note: "" }],
                }
            }
        })
    }

    const handleNoteChange = (area: string, note: string) => {
        setFormData((prev) => ({
            ...prev,
            painAreas: prev.painAreas.map((p) => (p.area === area ? { ...p, note } : p)),
        }))
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-xl border border-gray-100 space-y-6 relative" // space-y-10 -> space-y-6
        >
            {/* 헤더 섹션 */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>
                <p className="text-sm text-gray-500">당신의 맞춤형 피트니스 정보를 입력해주세요.</p>
            </div>

            {/* 1. 기본 정보 */}

            <section>
                {/* mb-6 -> mb-3 으로 변경: 제목과 필드 사이를 좁힘 */}
                <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">기본 정보</h2>
                </div>

                {/* gap-6 -> gap-y-3 으로 변경: 필드들 사이의 행 간격을 좁힘 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    {/* space-y-1.5 -> space-y-0.5 으로 변경: 라벨과 인풋 사이를 좁힘 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">닉네임</label>
                        <input
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleChange}
                            className="w-full mt-1 p-2 border rounded-md"
                            placeholder="사용할 닉네임"
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

                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">생년월일</label>
                        <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-0.5 col-span-full md:col-span-1">
                        <label className="text-xs font-semibold text-gray-500">성별</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                        >
                            {GENDER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* 2. 피트니스 상세 정보 */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-bold text-gray-900">피트니스 상세 정보</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 셀렉트 박스 스타일 통일 */}
                    {[
                        { label: "운동 목표", name: "goalType", options: GOAL_OPTIONS },
                        { label: "분할 방식", name: "splitType", options: SPLIT_OPTIONS },
                        { label: "운동 경력", name: "experienceLevel", options: EXP_OPTIONS },
                    ].map((field) => (
                        <div key={field.name} className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">{field.label}</label>
                            <select
                                name={field.name}
                                value={String(formData[field.name as keyof typeof formData])}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            >
                                {field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}

                    {/* 숫자 입력 필드도 스타일 통일 */}
                    {[
                        { label: "주당 운동 횟수", name: "trainingDaysPerWeek" },
                        { label: "체중 (kg)", name: "bodyWeightKg" },
                        { label: "체지방률 (%)", name: "bodyFatPct" },
                    ].map((field) => (
                        <div key={field.name} className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">{field.label}</label>
                            <input
                                type="number"
                                name={field.name}
                                value={String(formData[field.name as keyof typeof formData])}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-900">운동 가능 요일</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => handleDayToggle(day.value)}
                            className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all border ${
                                formData.availableDays.includes(day.value)
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* 3. 장비 선택 */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Dumbbell className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-gray-900">사용 가능한 장비</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    {EQUIPMENTS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => handleEquipmentToggle(item.value)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                                formData.equipmentAccess.includes(item.value)
                                    ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Bandage className="w-6 h-6 text-amber-600" />
                    <h2 className="text-lg font-bold text-gray-900">부상 부위</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* 분리된 컴포넌트 사용 */}
                    <AnatomyModel data={domsData} onMuscleClick={handleMuscleClick} mode="injury" />
                </div>
                {formData.painAreas.length > 0 && (
                    <div className="space-y-3 pt-4 border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center justify-between w-full pb-3 cursor-pointer"
                        >
                            <h3 className="text-sm font-semibold text-gray-700">부위별 상세 메모</h3>
                            <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isExpanded && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                {formData.painAreas.map((item) => (
                                    <div key={item.area} className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder={`${PAIN_AREA_LABELS[item.area] || item.area} 부상 설명`}
                                            value={item.note}
                                            onChange={(e) => handleNoteChange(item.area, e.target.value)}
                                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="sticky bottom-0 -mx-8 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-3 z-50">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex-1"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={nicknameStatus === "duplicate" || nicknameStatus === "checking"}
                        className="flex-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                    >
                        저장하기
                    </button>
                </div>
            </div>
        </form>
    )
}
