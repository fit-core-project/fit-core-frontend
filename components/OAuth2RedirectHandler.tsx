"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export default function OAuth2RedirectHandler() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const setToken = useAuthStore((state) => state.setToken)

    useEffect(() => {
        const token = searchParams.get("token")
        const mode = searchParams.get("mode")

        if (token) {
            setToken(token)

            // 2. 모드에 따라 분기
            if (mode === "link") {
                router.replace("/my")
            } else {
                // 일반 로그인/신규 가입
                router.replace("/")
            }
        } else {
            // 토큰이 없으면 로그인 실패로 간주
            router.replace("/login")
        }
    }, [searchParams, router, setToken])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <p className="animate-pulse">로그인 처리 중입니다...</p>
        </div>
    )
}
