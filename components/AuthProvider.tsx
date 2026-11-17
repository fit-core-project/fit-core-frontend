"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { jwtDecode } from "jwt-decode"
import { toast } from "sonner"
import { buildLoginUrl, consumeManualLogout, isProtectedPath, isUnsavedWorkPath, rememberReturnPath } from "@/lib/axios/authRedirect"

const isTokenExpired = (token: string): boolean => {
    if (!token) return true
    try {
        const decoded = jwtDecode<{ exp?: number }>(token)
        if (typeof decoded.exp !== "number") return false
        return decoded.exp < Math.floor(Date.now() / 1000)
    } catch {
        return true
    }
}

function currentReturnPath(pathname: string): string {
    if (typeof window === "undefined") return pathname
    return `${pathname}${window.location.search}`
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state) => state.token)
    const isLoading = useAuthStore((state) => state.isLoading)
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

    useEffect(() => {
        if (!isMounted) return

        // 1. 만료된 토큰은 정리하고 로그인으로 보낸다(돌아올 경로 기억).
        // The workout player is exempt: it keeps its payload and offers re-login when saving fails.
        if (token && isTokenExpired(token) && !isUnsavedWorkPath(pathname)) {
            const returnPath = isProtectedPath(pathname) ? currentReturnPath(pathname) : null
            rememberReturnPath(returnPath)
            toast.error("로그인이 만료됐어요", { description: "다시 로그인해 주세요.", id: "session-expired" })
            clearToken()
            router.replace(buildLoginUrl(returnPath))
            return
        }

        // 2. 보호된 경로: 인증 확인(AuthInitializer)이 끝난 뒤 토큰이 없으면 로그인으로.
        // Only known protected sections redirect; unknown paths render the 404 page.
        if (isLoading) return
        if (!token && isProtectedPath(pathname)) {
            if (consumeManualLogout()) {
                router.replace(buildLoginUrl(null))
                return
            }
            const returnPath = currentReturnPath(pathname)
            rememberReturnPath(returnPath)
            router.replace(buildLoginUrl(returnPath))
        }
    }, [pathname, token, isLoading, clearToken, router, isMounted])

    // 마운트되기 전에는 아무것도 렌더링하지 않습니다.
    if (!isMounted) {
        return null
    }

    return <>{children}</>
}

/**
 * Renders route content only when it may be shown: public and unknown (404) routes always, protected routes
 * once auth is resolved and a token exists. While the redirect fires it renders a neutral area.
 */
export function ProtectedContent({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((s) => s.token)
    const isLoading = useAuthStore((s) => s.isLoading)
    const pathname = usePathname()

    if (!isProtectedPath(pathname)) return <>{children}</>
    if (isLoading || !token) return <div className="flex-1 bg-ground" aria-hidden />
    return <>{children}</>
}
