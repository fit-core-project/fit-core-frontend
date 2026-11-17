"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import SocialButton from "@/app/components/SocialButton"
import { useAuthStore } from "@/store/authStore"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"
import { Button } from "@/components/ui"
import { isDemoLoginEnabled } from "@/utils/demoLoginFlag"
import {
    consumeReturnPath,
    peekReturnPath,
    preservingFailedWorkoutSave,
    readReturnPathFromSearch,
    rememberReturnPath,
} from "@/lib/axios/authRedirect"

// NEXT_PUBLIC_ENABLE_DEMO_LOGIN: "true" shows it; unset shows it only outside production builds.
const SHOW_DEMO_LOGIN = isDemoLoginEnabled()

/** `?next=` wins; otherwise the path the guard or the 401 handler stashed. */
function resolveReturnPath(): string | null {
    if (typeof window === "undefined") return null
    return readReturnPathFromSearch(window.location.search) ?? peekReturnPath()
}

export default function LoginPage() {
    const router = useRouter()
    const setToken = useAuthStore((state) => state.setToken)
    const token = useAuthStore((state) => state.token)
    const isLoading = useAuthStore((state) => state.isLoading)

    // Already logged in and sent here with a return path (e.g. /admin after a browser restart):
    // go straight back. The role cookie was re-set on rehydrate.
    useEffect(() => {
        if (isLoading || !token) return
        const fromQuery = readReturnPathFromSearch(window.location.search)
        if (!fromQuery) return
        consumeReturnPath()
        router.replace(fromQuery)
    }, [isLoading, token, router])

    const handleSocialLogin = (provider: string) => {
        // The OAuth round trip only carries token/mode back, so keep the return path in sessionStorage.
        rememberReturnPath(resolveReturnPath())
        window.location.href = `${getBackendBaseUrl()}/oauth2/authorization/${provider}`
    }

    const handleDemoLogin = async () => {
        const { seedDemoSession, createDemoToken } = await import("@/utils/demoMode")
        const returnPath = resolveReturnPath()
        preservingFailedWorkoutSave(seedDemoSession)
        setToken(createDemoToken())
        useAuthStore.getState().setIsLoading(false)
        consumeReturnPath()
        router.replace(returnPath ?? "/")
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

                <footer className="mt-6 flex flex-col items-center gap-1 text-center text-caption text-ink-2">
                    <p>로그인 전에 이용약관과 개인정보 처리방침을 확인하세요.</p>
                    <nav aria-label="약관" className="flex items-center gap-2">
                        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 font-bold text-ink underline underline-offset-2">
                            이용약관
                        </Link>
                        <span aria-hidden>·</span>
                        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 font-bold text-ink underline underline-offset-2">
                            개인정보 처리방침
                        </Link>
                    </nav>
                </footer>
            </div>
        </div>
    )
}
