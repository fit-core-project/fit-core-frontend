"use client"

import { KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import NutritionTargetSection from "@/app/my/nutrition/NutritionTargetSection"

type TabId = "profile" | "stats" | "workout" | "nutrition" | "settings"

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "profile", label: "프로필", icon: <User className="size-5" aria-hidden /> },
    { id: "stats", label: "통계", icon: <Trophy className="size-5" aria-hidden /> },
    { id: "workout", label: "운동", icon: <Dumbbell className="size-5" aria-hidden /> },
    { id: "nutrition", label: "영양", icon: <Utensils className="size-5" aria-hidden /> },
    { id: "settings", label: "설정", icon: <Settings className="size-5" aria-hidden /> },
]

const VALID_TABS: TabId[] = ["profile", "stats", "workout", "nutrition", "settings"]


export default function MyPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isEditing, setIsEditing] = useState(false)
    const activeTab = useMemo<TabId>(() => {
        const param = searchParams.get("tab")
        return VALID_TABS.includes(param as TabId) ? (param as TabId) : "profile"
    }, [searchParams])
    const user = useAuthStore((state) => state.user)
    const [profile, setProfile] = useState<UserResponse | null>(null)
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
    const selectTab = (id: TabId) => router.replace(id === "profile" ? "/my" : `/my?tab=${id}`, { scroll: false })
    const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let next = -1
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length
        else if (event.key === "Home") next = 0
        else if (event.key === "End") next = tabs.length - 1
        if (next < 0) return
        event.preventDefault()
        tabRefs.current[next]?.focus()
        selectTab(tabs[next].id)
    }
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
            toast.error("사용자 정보를 찾지 못했어요. 다시 로그인해 주세요.")
            return
        }

        profileApiClient
            .updateMe(updatedData as UserUpdateRequest)
            .then((res) => {
                toast.success("프로필을 저장했어요.")
                setIsEditing(false)
                setProfile(res)
            })
            .catch(() => {
                toast.error("프로필을 저장하지 못했어요. 잠시 후 다시 시도하세요.")
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

            toast.success("체성분 기록을 저장했어요.")
            setProfile(res)
            return true
        } catch (error) {
            console.error("Update Error:", error)
            toast.error("체성분 기록을 저장하지 못했어요. 잠시 후 다시 시도하세요.")
            return false
        }
    }

    return (
        <div className="mx-auto w-full max-w-[480px] bg-ground px-4 pb-24 pt-2">
            <div role="tablist" aria-label="마이 페이지" className="mb-5 grid grid-cols-5 border-b border-hairline">
                {tabs.map((tab, index) => {
                    const selected = activeTab === tab.id
                    return (
                        <button
                            type="button"
                            key={tab.id}
                            ref={(el) => {
                                tabRefs.current[index] = el
                            }}
                            role="tab"
                            id={`my-tab-${tab.id}`}
                            aria-selected={selected}
                            aria-controls="my-tabpanel"
                            tabIndex={selected ? 0 : -1}
                            onClick={() => selectTab(tab.id)}
                            onKeyDown={(event) => onTabKeyDown(event, index)}
                            className={`-mb-px flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-caption transition-colors ${
                                selected ? "border-ink font-bold text-ink" : "border-transparent font-medium text-ink-2 hover:text-ink"
                            }`}
                        >
                            {tab.icon}
                            <span className="w-full truncate">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            <div id="my-tabpanel" role="tabpanel" aria-labelledby={`my-tab-${activeTab}`} className="min-h-[360px]">
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
                    <div className="flex flex-col gap-8">
                        <BodyCompositionPage profile={profile} onSave={onBodyCompositionSave} />
                        <PrSection />
                        <NutritionTrendSection />
                    </div>
                )}
                {activeTab === "workout" && <WorkoutTab />}
                {activeTab === "nutrition" && <NutritionTargetSection />}
                {activeTab === "settings" && <SettingsPanel />}
            </div>
        </div>
    )
}
