"use client"

import { ReactNode, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Dumbbell, Settings, Trophy, User, Utensils } from "lucide-react"
import { toast } from "sonner"
import Profile from "@/app/my/profile/Profile"
import ProfileEditForm from "@/app/my/profile/ProfileEditForm"
import { BodyComposition, UserResponse, UserUpdateRequest } from "@/types/project"
import { useAuthStore } from "@/store/authStore"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import BodyCompositionPage from "@/app/my/body-composition/BodyComposition"
import PrSection from "@/app/my/stats/PrSection"
import NutritionTrendSection from "@/app/my/stats/NutritionTrendSection"
import SettingsPanel from "@/app/my/settings/Settings"
import WorkoutTab from "@/app/my/workout/WorkoutTab"
import NutritionTab from "@/app/my/nutrition/NutritionTab"

type TabId = "profile" | "stats" | "workout" | "nutrition" | "settings"

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "profile", label: "프로필", icon: <User size={18} /> },
    { id: "stats", label: "통계", icon: <Trophy size={18} /> },
    { id: "workout", label: "운동", icon: <Dumbbell size={18} /> },
    { id: "nutrition", label: "영양", icon: <Utensils size={18} /> },
    { id: "settings", label: "설정", icon: <Settings size={18} /> },
]

const VALID_TABS: TabId[] = ["profile", "stats", "workout", "nutrition", "settings"]

function StatsHubLink({
    href,
    title,
    description,
    icon,
}: {
    href: string
    title: string
    description: string
    icon: ReactNode
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
            </div>
        </Link>
    )
}

export default function MyPageContent() {
    const searchParams = useSearchParams()
    const [isEditing, setIsEditing] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        const param = searchParams.get("tab")
        return VALID_TABS.includes(param as TabId) ? (param as TabId) : "profile"
    })
    const user = useAuthStore((state) => state.user)
    const [profile, setProfile] = useState<UserResponse | null>(null)

    const logout = useCallback(() => {
        useAuthStore.getState().logout()
        window.location.href = "/login"
    }, [])

    useEffect(() => {
        if (!user?.email) {
            logout()
            return
        }

        profileApiClient.getMe().then(setProfile).catch(logout)
    }, [user, logout])

    const onSave = async (updatedData: Partial<UserResponse>) => {
        if (!profile?.email) {
            toast.error("사용자 정보를 찾을 수 없습니다.")
            return
        }

        profileApiClient
            .updateMe(updatedData as UserUpdateRequest)
            .then((res) => {
                toast.success("프로필이 성공적으로 업데이트되었습니다.")
                setIsEditing(false)
                setProfile(res)
            })
            .catch(() => {
                toast.error("프로필 업데이트 중 오류가 발생했습니다.")
            })
    }

    const onBodyCompositionSave = async (formData: BodyComposition): Promise<boolean> => {
        const existingSnapshots = profile?.bodyCompositionSnapshot || []
        const updatedSnapshots = [...existingSnapshots, formData]

        try {
            const res = await profileApiClient.updateMe({
                ...profile,
                bodyCompositionSnapshot: updatedSnapshots,
            } as UserUpdateRequest)

            toast.success("체성분 정보가 성공적으로 업데이트되었습니다.")
            setProfile(res)
            return true
        } catch (error) {
            console.error("Update Error:", error)
            toast.error("체성분 업데이트 중 오류가 발생했습니다.")
            return false
        }
    }

    return (
        <div className="mx-auto w-full max-w-[480px] p-4">
            <div className="mb-6 grid grid-cols-5 border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex min-w-0 flex-col items-center justify-center gap-1 border-b-2 px-1 py-3 text-[11px] font-medium transition-colors ${
                            activeTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab.icon}
                        <span className="w-full truncate">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="min-h-[360px]">
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
                {activeTab === "stats" && (
                    <>
                        <BodyCompositionPage profile={profile} onSave={onBodyCompositionSave} />
                        <PrSection />
                        <NutritionTrendSection />
                        <div className="mt-6 space-y-3">
                            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                일일 기록 허브
                            </p>
                            <StatsHubLink
                                href="/workout"
                                title="운동 페이지로 이동"
                                description="운동 기록, 운동 캘린더, 주간 목표 진행률을 확인합니다."
                                icon={<Dumbbell size={18} />}
                            />
                            <StatsHubLink
                                href="/nutrition"
                                title="영양 페이지로 이동"
                                description="식단 캘린더와 오늘 섭취량, 주간 칼로리 진행률을 확인합니다."
                                icon={<Utensils size={18} />}
                            />
                        </div>
                    </>
                )}
                {activeTab === "workout" && <WorkoutTab />}
                {activeTab === "nutrition" && <NutritionTab />}
                {activeTab === "settings" && <SettingsPanel />}
            </div>
        </div>
    )
}
