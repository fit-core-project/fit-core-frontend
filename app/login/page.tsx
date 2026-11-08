"use client"

import { useRouter } from "next/navigation"
import SocialButton from "@/app/components/SocialButton"
import { useAuthStore } from "@/store/authStore"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"
import { Button } from "@/components/ui"

// NEXT_PUBLIC_ENABLE_DEMO_LOGIN: show demo login unless explicitly set to 'false'
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN !== "false"

export default function LoginPage() {
    const router = useRouter()
    const setToken = useAuthStore((state) => state.setToken)

    const handleSocialLogin = (provider: string) => {
        window.location.href = `${getBackendBaseUrl()}/oauth2/authorization/${provider}`
    }

    const handleDemoLogin = async () => {
        const { seedDemoSession, createDemoToken } = await import("@/utils/demoMode")
        seedDemoSession()
        setToken(createDemoToken())
        useAuthStore.getState().setIsLoading(false)
        router.replace("/")
    }

    return (
        <div className="flex h-full w-full flex-1 flex-col justify-center bg-ground px-4 py-10">
            <div className="flex w-full flex-col">
                <div className="mb-8">
                    <h1 className="text-headline font-bold text-ink">로그인</h1>
                    <p className="mt-2 text-body text-ink-2">오늘 운동을 시작하려면 계정으로 로그인하세요.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <SocialButton provider="kakao" imageSrc="/images/kakao.png" onClick={handleSocialLogin} />
                    <SocialButton provider="naver" imageSrc="/images/naver.png" onClick={handleSocialLogin} />
                    <SocialButton provider="google" imageSrc="/images/google.png" onClick={handleSocialLogin} />
                </div>

                {SHOW_DEMO_LOGIN && (
                    <>
                        <div className="my-6 flex items-center gap-3" role="separator" aria-label="포트폴리오 데모">
                            <div className="h-px flex-1 bg-hairline" />
                            <span className="text-caption font-medium text-ink-2">포트폴리오 데모</span>
                            <div className="h-px flex-1 bg-hairline" />
                        </div>

                        <Button variant="secondary" size="lg" block onClick={handleDemoLogin}>
                            테스트 모드 로그인
                        </Button>
                        <p className="mt-2 text-center text-caption text-ink-2">예시 데이터가 들어 있는 계정으로 둘러볼 수 있어요.</p>
                    </>
                )}

                <Button variant="ghost" block className="mt-8" onClick={() => router.push("/")}>
                    돌아가기
                </Button>
            </div>
        </div>
    )
}
