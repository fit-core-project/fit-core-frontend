// store/authStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { jwtDecode, JwtPayload } from "jwt-decode"

interface FitCoreJwt extends JwtPayload {
    auth: string
    profileImage?: string | null
}

interface UserInfo {
    email: string
    role: string
    profileImage: string | null
}

interface AuthState {
    token: string | null
    user: UserInfo | null
    isLoading: boolean // 추가: 초기화 여부 체크
    setIsLoading: (loading: boolean) => void
    setToken: (token: string) => void
    logout: () => void
    clearToken: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLoading: true, // 처음엔 true로 설정 (초기화 중)
            setIsLoading: (loading) => set({ isLoading: loading }),
            setToken: (token: string) => {
                const decoded = jwtDecode<FitCoreJwt>(token)
                set({
                    token,
                    user: {
                        email: decoded.sub ?? "",
                        role: decoded.auth,
                        profileImage: decoded.profileImage ?? null,
                    },
                })
            },
            logout: () => set({ token: null, user: null }),
            clearToken: () => set({ token: null }),
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            // 초기화 시점에 isLoading을 true로 유지하기 위해 부분적으로만 저장할 수도 있음
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
)
