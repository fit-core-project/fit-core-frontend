"use client"
import React, { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { UserResponse } from "@/types/project"
import { Edit3, ShieldCheck, User } from "lucide-react"
import SocialButton from "@/app/components/SocialButton"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { useAuthStore } from "@/store/authStore"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"
import { toast } from "sonner"
import { Button, Section, Sheet, Skeleton } from "@/components/ui"

interface ProfileProps {
    profile: UserResponse | null
    logout: () => void
    onEdit: () => void
}

export default function Profile({ profile, logout, onEdit }: ProfileProps) {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)
    const [isNickName, setIsNickname] = useState(false)
    const router = useRouter()
    const userRole = useAuthStore((state) => state.user?.role)
    const isAdmin = userRole?.includes("ROLE_ADMIN") ?? false

    const toggleImageModal = () => {
        setIsImageModalOpen(!isImageModalOpen)
    }

    const handleSocialLogin = async (provider: string) => {
        await profileApiClient.setLinkMode()
        window.location.href = `${getBackendBaseUrl()}/oauth2/authorization/${provider}`
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center gap-3 py-6" aria-busy="true">
                <Skeleton className="size-24 rounded-full" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-6 h-11 w-full" />
            </div>
        )
    }

    const hasImage = Boolean(profile.profileImageUrl)

    return (
        <div className="flex w-full flex-col gap-8 py-2">
            <div className="flex flex-col items-center text-center">
                {hasImage ? (
                    <button
                        type="button"
                        onClick={toggleImageModal}
                        aria-label="프로필 사진 크게 보기"
                        className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={profile.profileImageUrl ?? undefined} alt="" className="size-full object-cover" />
                    </button>
                ) : (
                    <div className="flex size-24 items-center justify-center rounded-full border border-hairline bg-surface">
                        <User className="size-12 text-ink-3" aria-hidden />
                    </div>
                )}
                <button
                    type="button"
                    className="mt-4 min-h-11 rounded-control px-2 text-title font-bold text-ink hover:bg-surface"
                    aria-label={isNickName ? `${profile.name}, 눌러서 닉네임 보기` : `${profile.nickname ?? "닉네임 없음"}, 눌러서 이름 보기`}
                    onClick={() => {
                        if (!profile.nickname) {
                            toast.error("프로필 수정에서 닉네임을 먼저 정해 주세요.")
                            return
                        }

                        setIsNickname(!isNickName)
                    }}
                >
                    {isNickName ? profile?.name : profile.nickname}
                </button>
                <p className="text-body-sm text-ink-2">{profile?.email}</p>
            </div>

            <Button variant="secondary" block icon={<Edit3 className="size-4" aria-hidden />} onClick={onEdit}>
                프로필 수정하기
            </Button>

            <Section title="소셜 계정 연동">
                <div className="flex flex-col gap-2">
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
            </Section>

            <div className="flex flex-col gap-2 border-t border-hairline pt-6">
                {isAdmin && (
                    <Button variant="secondary" block icon={<ShieldCheck className="size-4" aria-hidden />} onClick={() => router.push("/admin")}>
                        관리자 페이지 열기
                    </Button>
                )}
                <button
                    type="button"
                    onClick={logout}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-control text-body-sm font-bold text-danger-ink transition-colors hover:bg-danger-bg"
                >
                    로그아웃
                </button>
            </div>

            {hasImage && (
                <Sheet open={isImageModalOpen} onClose={toggleImageModal} title="프로필 사진">
                    <Image
                        src={profile.profileImageUrl as string}
                        alt="프로필 사진"
                        width={1200}
                        height={1200}
                        unoptimized
                        className="mx-auto max-h-[70dvh] w-full rounded-control object-contain"
                    />
                </Sheet>
            )}
        </div>
    )
}
