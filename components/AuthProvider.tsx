"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { jwtDecode } from "jwt-decode"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state) => state.token)
    const clearToken = useAuthStore((state) => state.clearToken)
    const router = useRouter()
    const pathname = usePathname()

    // 하이드레이션 에러 방지 (클라이언트 사이드 렌더링 확인)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        // 큐의 끝으로 미뤄서 동기적 실행 방지
        const timeout = setTimeout(() => {
            setIsMounted(true)
        }, 0)
        return () => clearTimeout(timeout)
    }, [])

    const isTokenExpired = (token: string): boolean => {
        if (!token) return true
        try {
            const decoded = jwtDecode<{ exp: number }>(token)
            const currentTime = Math.floor(Date.now() / 1000)
            return decoded.exp < currentTime
        } catch {
            return true
        }
    }

    useEffect(() => {
        if (!isMounted) return

        // 1. 토큰이 존재할 때만 만료 체크
        if (token) {
            if (isTokenExpired(token)) {
                alert("세션이 만료되었습니다. 다시 로그인해주세요.")
                clearToken()
                router.replace("/login")
                return
            }
        }

        // 2. 보호된 경로 접근 제어 (선택 사항)
        const publicPaths = ["/login", "/signup", "/oauth2/redirect"]
        const isPublicPath = publicPaths.some((path) => pathname.startsWith(path)) || pathname === "/"

        if (!token && !isPublicPath) {
            // 토큰이 없는데 공용 페이지가 아닌 곳에 접근하면 로그인으로 리다이렉트
            // router.replace("/login")
        }
    }, [pathname, token, clearToken, router, isMounted])

    // 마운트되기 전에는 아무것도 렌더링하지 않거나 로딩 스피너를 보여줍니다.
    if (!isMounted) {
        return null
    }

    return <>{children}</>
}
