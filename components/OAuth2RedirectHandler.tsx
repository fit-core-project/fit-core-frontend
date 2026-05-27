"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { jwtDecode, JwtPayload } from "jwt-decode"
import { useAuthStore } from "@/store/authStore"

interface FitCoreJwt extends JwtPayload {
    auth: string
}

export default function OAuth2RedirectHandler() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const setToken = useAuthStore((state) => state.setToken)

    useEffect(() => {
        const token = searchParams.get("token")
        const mode = searchParams.get("mode")

        if (token) {
            setToken(token)

            if (mode === "link") {
                router.replace("/my")
            } else {
                try {
                    const decoded = jwtDecode<FitCoreJwt>(token)
                    if (decoded.auth?.includes("ROLE_ADMIN")) {
                        router.replace("/admin")
                    } else {
                        router.replace("/")
                    }
                } catch {
                    router.replace("/")
                }
            }
        } else {
            router.replace("/login")
        }
    }, [searchParams, router, setToken])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <p className="animate-pulse">로그인 처리 중입니다...</p>
        </div>
    )
}
