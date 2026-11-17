"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { jwtDecode, JwtPayload } from "jwt-decode"
import { toast } from "sonner"
import { useAuthStore } from "@/store/authStore"
import { consumeReturnPath, peekReturnPath } from "@/lib/axios/authRedirect"

interface FitCoreJwt extends JwtPayload {
    auth: string
}

export default function OAuth2RedirectHandler() {
    const router = useRouter()
    const setToken = useAuthStore((state) => state.setToken)
    const handledRef = useRef(false)

    useEffect(() => {
        // Read the query once: replaceState below would otherwise re-run this effect with no token.
        if (handledRef.current) return
        handledRef.current = true

        const params = new URLSearchParams(window.location.search)
        const token = params.get("token")
        const mode = params.get("mode")
        const error = params.get("error")

        // Drop the token from the address bar and history as soon as it is read.
        window.history.replaceState(window.history.state, "", window.location.pathname)

        // Keep the stashed return path on failure so the next login attempt still returns there.
        const returnPath = peekReturnPath()

        if (error || !token) {
            toast.error(mode === "link" ? "계정을 연결하지 못했어요" : "로그인하지 못했어요", {
                description: "잠시 후 다시 시도해 주세요.",
            })
            router.replace(mode === "link" ? "/my" : "/login")
            return
        }

        let isAdmin = false
        try {
            isAdmin = Boolean(jwtDecode<FitCoreJwt>(token).auth?.includes("ROLE_ADMIN"))
            setToken(token)
        } catch {
            toast.error("로그인하지 못했어요", { description: "잠시 후 다시 시도해 주세요." })
            router.replace("/login")
            return
        }

        consumeReturnPath()

        if (mode === "link") {
            toast.success("계정을 연결했어요")
            router.replace("/my")
            return
        }

        router.replace(returnPath ?? (isAdmin ? "/admin" : "/"))
    }, [router, setToken])

    return (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4">
            <p role="status" className="text-body text-ink-2 motion-safe:animate-pulse">
                로그인 처리 중이에요
            </p>
        </div>
    )
}
