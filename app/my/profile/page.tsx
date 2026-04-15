"use client"

import { useAuthStore } from "@/store/authStore"
import { useEffect, useState, useCallback } from "react"
import { UserResponse } from "@/types/project"
import ProfileService from "@/lib/api/profile/ProfileService"
import moment from "moment"
import { Calendar as BigCalendar, CalendarIcon, Edit3, User, X } from "lucide-react"
import { momentLocalizer } from "react-big-calendar"

const localizer = momentLocalizer(moment)

export default function Page() {
    const user = useAuthStore((state) => state.user)
    const [profile, setProfile] = useState<UserResponse | null>(null)
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)

    const toggleImageModal = () => {
        setIsImageModalOpen(!isImageModalOpen)
    }

    // logout 함수를 useCallback으로 감싸서 의존성 문제 해결
    const logout = useCallback(() => {
        useAuthStore.getState().logout()
        window.location.href = "/login"
    }, [])

    useEffect(() => {
        if (!user?.email) {
            logout()
            return
        }

        ProfileService.getMyProfile(user.email).then(setProfile).catch(logout)
    }, [user, logout])

    if (!profile) return <div>로딩 중...</div>

    return (
        <div className="w-100 mx-auto p-6 space-y-8">
            {/* 1. 상단 프로필 영역 */}
            <div className="flex flex-col items-center">
                <div className="relative">
                    {/* [수정] 클릭 시 모달 오픈 이벤트 추가 */}
                    <div
                        className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg cursor-pointer"
                        onClick={toggleImageModal}
                    >
                        {profile?.profileImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={64} className="text-gray-400" />
                        )}
                    </div>
                </div>
                <h2 className="mt-4 text-2xl font-bold">{profile?.name}</h2>
                <p className="text-gray-500">{profile?.email}</p>
            </div>

            {/* [추가] 이미지 확대 모달 (LightBox) */}
            {isImageModalOpen && profile?.profileImageUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={toggleImageModal} // 배경 클릭 시 닫기
                >
                    {/* 닫기 버튼 */}
                    <button
                        className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
                        onClick={toggleImageModal}
                    >
                        <X size={24} />
                    </button>

                    {/* 확대된 이미지 (w 크기 최대로 잡음) */}
                    <img
                        src={profile.profileImageUrl}
                        alt="Profile Zoomed"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()} // 이미지 클릭 시 닫힘 방지
                    />
                </div>
            )}
        </div>
    )
}
