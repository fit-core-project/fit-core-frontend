"use client"

import { useRouter } from "next/navigation"
import { UserCircle } from "lucide-react"
import SocialButton from "@/app/components/SocialButton"
import AxiosController from "@/lib/axios/AxiosController"
import { useAuthStore } from "@/store/authStore"

// NODE_ENV is inlined at build time; webpack eliminates the demo branch entirely
// in production builds, tree-shaking demoMode imports and the button JSX.
const IS_PROD = process.env.NODE_ENV === "production"

export default function LoginPage() {
    const router = useRouter()
    const setToken = useAuthStore((state) => state.setToken)

    const handleSocialLogin = (provider: string) => {
        const baseUrl = AxiosController.defaults.baseURL

        if (!baseUrl) {
            alert("백엔드 서버 주소(BASE_URL)가 설정되지 않았습니다.")
            return
        }

        window.location.href = `${baseUrl}/oauth2/authorization/${provider}`
    }

    // handleDemoLogin and its dynamic import are dead code when IS_PROD=true,
    // so webpack eliminates demoMode.ts from the production bundle.
    const handleDemoLogin = async () => {
        const { seedDemoSession, createDemoToken } = await import("@/utils/demoMode")
        seedDemoSession()
        setToken(createDemoToken())
        useAuthStore.getState().setIsLoading(false)
        router.replace("/")
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

                {!IS_PROD && (
                    <>
                        <div className="my-6 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-100" />
                            <span className="text-[11px] font-bold text-slate-400">PORTFOLIO DEMO</span>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <button
                            type="button"
                            onClick={handleDemoLogin}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 active:scale-[0.99]"
                        >
                            테스트 모드 로그인
                        </button>
                    </>
                )}

                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="mt-8 group text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                >
                    돌아가기
                </button>
            </div>
        </div>
    )
}
