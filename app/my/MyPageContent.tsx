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
import { clearOnboardingFlags } from "@/lib/api/profile/onboardingFlag"
import { markManualLogout } from "@/lib/axios/authRedirect"
import { Button, Notice } from "@/components/ui"
import BodyCompositionPage from "@/app/my/body-composition/BodyComposition"
import {
    type BodyCompositionRef,
    addBodyComposition,
    removeBodyComposition,
    replaceBodyComposition,
} from "@/app/my/body-composition/bodyCompositionList"
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
        markManualLogout()
        clearOnboardingFlags()
        useAuthStore.getState().logout()
        window.location.href = "/login"
    }, [])
    const afterWithdraw = useCallback(() => {
        markManualLogout()
        clearOnboardingFlags()
        useAuthStore.getState().logout({ withdrawn: true })
        window.location.href = "/login"
    }, [])
    const [loadError, setLoadError] = useState(false)
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [retrying, setRetrying] = useState(false)

    useEffect(() => {
        if (!user?.email) {
            logout()
            return
        }

        // A failed load must not end the session: a 401 is handled globally by the axios interceptor,
        // anything else (network, 5xx) shows a notice with a retry button.
        let cancelled = false
        profileApiClient
            .getMe()
            .then((res) => {
                if (cancelled) return
                setProfile(res)
                setLoadError(false)
            })
            .catch((error) => {
                if (cancelled) return
                console.error("Profile load error:", error)
                setLoadError(true)
            })
            .finally(() => {
                if (!cancelled) setRetrying(false)
            })
        return () => {
            cancelled = true
        }
    }, [user, logout, loadAttempt])

    const retryLoad = () => {
        setRetrying(true)
        setLoadAttempt((n) => n + 1)
    }

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

    // PUT /api/profile/me merges: only the full, sorted snapshot list is sent (an empty list clears it).
    // On failure the profile state is untouched, so the list and chart stay as they were.
    const sendBodyCompositions = async (
        nextSnapshots: BodyComposition[] | null,
        successMessage: string,
        failureMessage: string
    ): Promise<boolean> => {
        // Without a loaded profile the stored list is unknown; sending would overwrite the history.
        if (!profile) {
            toast.error("프로필을 불러온 뒤 다시 시도하세요.")
            return false
        }
        if (!nextSnapshots) {
            toast.error("기록 목록이 바뀌었어요. 새로고침 후 다시 시도하세요.")
            return false
        }
        try {
            const res = await profileApiClient.updateMe({ bodyCompositionSnapshot: nextSnapshots })
            toast.success(successMessage)
            setProfile(res)
            return true
        } catch (error) {
            console.error("Body composition update error:", error)
            toast.error(failureMessage)
            return false
        }
    }

    const onBodyCompositionSave = (formData: BodyComposition) =>
        sendBodyCompositions(
            addBodyComposition(profile?.bodyCompositionSnapshot, formData),
            "체성분 기록을 저장했어요.",
            "체성분 기록을 저장하지 못했어요. 잠시 후 다시 시도하세요."
        )

    const onBodyCompositionUpdate = (ref: BodyCompositionRef, formData: BodyComposition) =>
        sendBodyCompositions(
            replaceBodyComposition(profile?.bodyCompositionSnapshot, ref, formData),
            "체성분 기록을 수정했어요.",
            "체성분 기록을 수정하지 못했어요. 잠시 후 다시 시도하세요."
        )

    const onBodyCompositionDelete = (ref: BodyCompositionRef) =>
        sendBodyCompositions(
            removeBodyComposition(profile?.bodyCompositionSnapshot, ref),
            "체성분 기록을 삭제했어요.",
            "체성분 기록을 삭제하지 못했어요. 잠시 후 다시 시도하세요."
        )

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

            {loadError && !profile && (
                <Notice tone="danger" title="프로필을 불러오지 못했어요" className="mb-5">
                    <p>네트워크 상태를 확인하고 다시 시도하세요.</p>
                    <Button variant="secondary" className="mt-2" loading={retrying} onClick={retryLoad}>
                        다시 불러오기
                    </Button>
                </Notice>
            )}

            <div id="my-tabpanel" role="tabpanel" aria-labelledby={`my-tab-${activeTab}`} className="min-h-[360px]">
                {activeTab === "profile" &&
                    !(loadError && !profile) &&
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
                        <BodyCompositionPage
                            profile={profile}
                            onSave={onBodyCompositionSave}
                            onUpdate={onBodyCompositionUpdate}
                            onDelete={onBodyCompositionDelete}
                        />
                        <PrSection />
                        <NutritionTrendSection />
                    </div>
                )}
                {activeTab === "workout" && <WorkoutTab />}
                {activeTab === "nutrition" && <NutritionTargetSection />}
                {activeTab === "settings" && <SettingsPanel onWithdrawn={afterWithdraw} />}
            </div>
        </div>
    )
}
