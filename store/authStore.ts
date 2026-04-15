// store/authStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { jwtDecode } from "jwt-decode"

interface UserInfo {
    email: string
    role: string
    profileImage: string | null
}

interface AuthState {
    token: string | null
    user: UserInfo | null
    setToken: (token: string) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setToken: (token: string) => {
                const decoded: any = jwtDecode(token)
                set({
                    token,
                    user: {
                        email: decoded.sub,
                        role: decoded.auth,
                        profileImage: decoded.profileImage || null,
                    },
                })
            },
            logout: () => set({ token: null, user: null }),
        }),
        { name: "auth-storage", storage: createJSONStorage(() => localStorage) }
    )
)
