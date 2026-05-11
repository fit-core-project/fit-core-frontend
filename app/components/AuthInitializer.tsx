"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { jwtDecode, JwtPayload } from "jwt-decode"
import { AxiosError } from "axios"
import profileApiClient from "@/lib/api/profile/profileApiClient"

export default function AuthInitializer() {
    const { token, logout, setIsLoading } = useAuthStore()

    useEffect(() => {
        const checkAuth = async () => {
            // 1. 토큰 자체가 없으면 즉시 로딩 종료
            if (!token) {
                setIsLoading(false)
                return
            }

            try {
                // 2. 로컬에서 토큰 만료 시간 먼저 확인 (불필요한 네트워크 요청 방지)
                const decoded = jwtDecode<JwtPayload>(token)
                const currentTime = Date.now() / 1000

                if (decoded.exp && decoded.exp < currentTime) {
                    logout()
                    return
                }

                // 3. 서버에 현재 내 프로필 정보 요청 (토큰 유효성 최종 검증)
                await profileApiClient.getMe()

                // 성공 시엔 별도 로직 필요 없음 (이미 Zustand에 유저 정보가 저장되어 있다면 유지)
            } catch (error: unknown) {
                // 4. 에러 처리
                if (error instanceof AxiosError && error.response) {
                    const status = error.response.status

                    // 인증 실패인 경우에만 로그아웃 (401: 권한 없음, 403: 접근 금지)
                    if (status === 401 || status === 403) {
                        console.error("인증이 유효하지 않습니다. 로그아웃합니다.")
                        logout()
                    }
                } else {
                    // 네트워크 에러(서버 다운)나 기타 오류인 경우
                    // 여기서 로그아웃을 시키면 서버 점검 때마다 사용자가 튕기므로
                    // 일단 로그아웃시키지 않고 로딩만 끝내서 앱을 진입시킵니다.
                    console.warn("서버 연결에 실패했습니다. 로컬 데이터를 유지합니다.", error)
                }
            } finally {
                // 5. 모든 검증이 끝났으므로 UI 렌더링 시작
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [token, logout, setIsLoading])

    // UI를 그리지 않는 컴포넌트입니다.
    return null
}
