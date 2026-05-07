"use client"

import React from "react"
import AxiosController from "@/lib/axios/AxiosController"
import SocialButton from "@/app/components/SocialButton"
import { UserCircle } from "lucide-react"

export default function LoginPage() {
    /**
     * 소셜 로그인 핸들러
     */
    const handleSocialLogin = (provider: string) => {
        const baseUrl = AxiosController.defaults.baseURL

        if (!baseUrl) {
            alert("백엔드 서버 주소(BASE_URL)가 설정되지 않았습니다.")
            return
        }
        window.location.href = `${baseUrl}/oauth2/authorization/${provider}`
    }

    return (
        <div className="flex-1 w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-10 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-5 border border-slate-200">
                        <UserCircle className="w-9 h-9 text-slate-500" />
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-800">서비스 로그인</h1>
                    <p className="mt-2 text-xs text-emerald-600 font-medium">Fit-Core 서비스를 시작합니다</p>
                </div>

                <div className="flex flex-col gap-3">
                    <SocialButton provider="kakao" imageSrc="/images/kakao.png" onClick={handleSocialLogin} />
                    <SocialButton provider="naver" imageSrc="/images/naver.png" onClick={handleSocialLogin} />
                    <SocialButton provider="google" imageSrc="/images/google.png" onClick={handleSocialLogin} />
                </div>

                <button
                    onClick={() => window.history.back()}
                    className="mt-10 group text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                ></button>
            </div>
        </div>
    )
}
