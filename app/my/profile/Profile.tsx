"use client"
import React, { useState } from "react"
import { UserResponse } from "@/types/project"
import { CalendarIcon, Edit3, User, X } from "lucide-react"
import SocialButton from "@/app/components/SocialButton"
import profileApiClient from "@/lib/api/profile/profileApiClient"

interface ProfileProps {
    profile: UserResponse | null
    logout: () => void
    onEdit: () => void
}

export default function Profile({ profile, logout, onEdit }: ProfileProps) {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)
    const [isNickName, setIsNickname] = useState(false)

    const toggleImageModal = () => {
        setIsImageModalOpen(!isImageModalOpen)
    }

    const handleSocialLogin = async (provider: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
        await profileApiClient.setLinkMode()
        window.location.href = `${baseUrl}/oauth2/authorization/${provider}`
    }

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
                <h2
                    className="mt-4 text-2xl font-bold"
                    onClick={() => {
                        if (!profile.nickname) {
                            alert("프로필 수정 화면에서 닉네임을 먼저 설정해주세요.")
                            return
                        }

                        setIsNickname(!isNickName)
                    }}
                >
                    {isNickName ? profile?.name : profile.nickname}
                </h2>
                <p className="text-gray-500">{profile?.email}</p>
                {/* 2. 프로필 관리 버튼 섹션 */}
                <div className="w-full max-w-md mx-auto mt-8 grid grid-cols-1 gap-3">
                    <button
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        onClick={onEdit}
                    >
                        <Edit3 size={18} />
                        프로필 정보 수정
                    </button>

                    <div className="w-full max-w-md mx-auto mt-8 space-y-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">소셜 계정 연동</p>

                        <SocialButton
                            provider="kakao"
                            imageSrc="/images/kakao.png"
                            onClick={handleSocialLogin}
                            isLinked={profile.linkedProviders?.includes("kakao")}
                            isConnect={!profile.linkedProviders?.includes("kakao")}
                        />
                        <SocialButton
                            provider="naver"
                            imageSrc="/images/naver.png"
                            onClick={handleSocialLogin}
                            isLinked={profile.linkedProviders?.includes("naver")}
                            isConnect={!profile.linkedProviders?.includes("naver")}
                        />
                        <SocialButton
                            provider="google"
                            imageSrc="/images/google.png"
                            onClick={handleSocialLogin}
                            isLinked={profile.linkedProviders?.includes("google")}
                            isConnect={!profile.linkedProviders?.includes("google")}
                        />
                    </div>
                    <button
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-100"
                        onClick={logout}
                    >
                        로그아웃
                    </button>
                </div>
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
