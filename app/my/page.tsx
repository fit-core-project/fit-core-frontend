"use client"

import { useCallback, useEffect, useState } from "react"
import { User, ClipboardList, Settings, Trophy, Dumbbell } from "lucide-react"
import Profile from "@/app/my/profile/Profile"
import ProfileEditForm from "@/app/my/profile/ProfileEditForm"
import { BodyComposition, UserResponse, UserUpdateRequest } from "@/types/project"
import { useAuthStore } from "@/store/authStore"
import ProfileService from "@/lib/api/profile/ProfileService"
import BodyCompositionPage from "@/app/my/body-composition/BodyComposition"

export default function Page() {
    const tabs = [
        { id: "profile", label: "프로필", icon: <User size={18} /> },
        { id: "stats", label: "체성분", icon: <Trophy size={18} /> },
        { id: "routine", label: "루틴", icon: <Dumbbell size={18} /> },
        { id: "history", label: "운동이력", icon: <ClipboardList size={18} /> },
        { id: "settings", label: "설정", icon: <Settings size={18} /> },
    ]

    const [isEditing, setIsEditing] = useState(false)
    const [activeTab, setActiveTab] = useState("profile") // 탭 상태 관리: 'profile', 'history', 'stats', 'settings'
    const user = useAuthStore((state) => state.user)
    const [profile, setProfile] = useState<UserResponse | null>(null)

    useEffect(() => {
        console.log(profile)
    }, [profile])

    const logout = useCallback(() => {
        useAuthStore.getState().logout()
        window.location.href = "/login"
    }, [])

    useEffect(() => {
        if (!user?.email) {
            logout()
            return
        }

        ProfileService.getMyProfile().then(setProfile).catch(logout)
    }, [user, logout])

    const onSave = async (updatedData: Partial<UserResponse>) => {
        if (!profile?.email) {
            alert("사용자 정보를 찾을 수 없습니다.")
            return
        }

        ProfileService.updateMyProfile(updatedData as UserUpdateRequest)
            .then((res) => {
                alert("프로필이 성공적으로 업데이트되었습니다.")
                setIsEditing(false)
                setProfile(res)
            })
            .catch((error) => {
                alert("프로필 업데이트 중 오류가 발생했습니다.")
            })
    }

    const onBodyCompositionSave = async (formData: BodyComposition): Promise<boolean> => {
        const existingSnapshots = profile?.bodyCompositionSnapshot || []
        const updatedSnapshots = [...existingSnapshots, formData]
        console.log(formData)
        try {
            const res = await ProfileService.updateMyProfile({
                ...profile,
                bodyCompositionSnapshot: updatedSnapshots,
            } as UserUpdateRequest)

            alert("프로필이 성공적으로 업데이트되었습니다.")
            setProfile(res)
            return true // 성공 시 true 리턴
        } catch (error) {
            console.error("Update Error:", error)
            alert("프로필 업데이트 중 오류가 발생했습니다.")
            return false // 실패 시 false 리턴
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            {/* 1. 상단 탭 메뉴 */}
            <div className="flex border-b border-gray-200 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 2. 탭 컨텐츠 영역 */}
            <div className="min-h-75">
                {activeTab === "profile" &&
                    (isEditing ? (
                        <ProfileEditForm
                            initialProfile={profile}
                            onSave={onSave}
                            onCancel={() => setIsEditing(false)}
                        />
                    ) : (
                        <Profile profile={profile} logout={logout} onEdit={() => setIsEditing(true)} />
                    ))}
                {activeTab === "stats" && <BodyCompositionPage profile={profile} onSave={onBodyCompositionSave} />}
                {activeTab === "routine" && <div className="text-center py-10">루틴이 여기에 표시됩니다.</div>}
                {activeTab === "history" && (
                    <div className="text-center py-10">운동 이력 리스트가 여기에 표시됩니다.</div>
                )}
                {activeTab === "settings" && (
                    <div className="text-center py-10">계정 설정 메뉴가 여기에 표시됩니다.</div>
                )}
            </div>
        </div>
    )
}
