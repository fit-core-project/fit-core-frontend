"use client"
import React from "react"
import AxiosController from "@/app/common/axios/AxiosController"
import SocialButton from "@/app/login/SocialButtonProps"

export default function LoginPage() {
    /**
     * 소셜 로그인 핸들러
     */
    const handleSocialLogin = (provider: string) => {
        // AxiosController의 설정을 공유하여 유지보수성 확보
        const baseUrl = AxiosController.defaults.baseURL

        if (!baseUrl) {
            alert("백엔드 서버 주소(BASE_URL)가 설정되지 않았습니다.")
            return
        }

        // 소셜 로그인 인증은 리다이렉트가 필요하므로 window.location.href 사용
        window.location.href = `${baseUrl}/oauth2/authorization/${provider}`
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F2F4F7]">
            <div className="w-full max-w-[400px] px-6">
                <div className="rounded-[12px] bg-white p-8 shadow-sm">
                    <div className="mb-10 text-center">
                        <h1 className="text-2xl font-bold text-[#111]">로그인</h1>
                        <p className="mt-2 text-sm text-[#666]">Fit-Core 서비스를 시작합니다</p>
                    </div>

                    <div className="flex flex-col gap-[10px]">
                        {/* 카카오: 공식 가이드 준수 */}
                        <SocialButton provider="kakao" imageSrc="/images/kakao.png" onClick={handleSocialLogin} />

                        {/* 네이버: 공식 가이드 준수 */}
                        <SocialButton provider="naver" imageSrc="/images/naver.png" onClick={handleSocialLogin} />

                        {/* 구글: 공식 가이드 준수 (테두리 포함) */}
                        <SocialButton provider="google" imageSrc="/images/google.svg" onClick={handleSocialLogin} />
                    </div>

                    <button
                        onClick={() => window.history.back()}
                        className="mt-8 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        이전 페이지로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    )
}
