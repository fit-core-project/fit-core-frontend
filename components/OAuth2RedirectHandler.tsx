// components/OAuth2RedirectHandler.tsx
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

        if (token) {
            // 1. Zustand 스토어에 토큰 저장 (디코딩 및 로컬스토리지 저장 자동 수행)
            setToken(token)
            // 2. 홈으로 이동 (뒤로가기 방지를 위해 replace 사용)
            router.replace("/")
        } else {
            router.replace("/login")
        }
    }, [searchParams, router, setToken])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <p>로그인 중입니다. 잠시만 기다려주세요...</p>
        </div>
    )
}
