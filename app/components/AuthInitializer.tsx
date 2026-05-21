"use client"

import { useEffect } from "react"
import { AxiosError } from "axios"
import { jwtDecode, JwtPayload } from "jwt-decode"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { useAuthStore } from "@/store/authStore"
import { isDemoMode } from "@/utils/demoMode"

export default function AuthInitializer() {
    const { token, logout, setIsLoading } = useAuthStore()

    useEffect(() => {
        const checkAuth = async () => {
            if (!token) {
                setIsLoading(false)
                return
            }

            try {
                if (isDemoMode()) {
                    setIsLoading(false)
                    return
                }

                const decoded = jwtDecode<JwtPayload>(token)
                const currentTime = Date.now() / 1000

                if (decoded.exp && decoded.exp < currentTime) {
                    logout()
                    return
                }

                await profileApiClient.getMe()
            } catch (error: unknown) {
                if (error instanceof AxiosError && error.response) {
                    const status = error.response.status

                    if (status === 401 || status === 403) {
                        console.error("인증이 유효하지 않습니다. 로그아웃합니다.")
                        logout()
                    }
                } else {
                    console.warn("서버 연결에 실패했습니다. 로컬 인증 상태를 유지합니다.", error)
                }
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [token, logout, setIsLoading])

    return null
}
