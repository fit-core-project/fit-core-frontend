// store/authStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { jwtDecode, JwtPayload } from "jwt-decode"
import { clearDemoSession } from "@/utils/demoMode"
import { buildRoleCookie, CLEAR_ROLE_COOKIE } from "@/lib/axios/authRedirect"
import { backfillAccountOwner, claimAccountData, forgetAccountData } from "@/utils/accountScopedStorage"
import { clearSupplementChat } from "@/utils/supplementChatStorage"

interface FitCoreJwt extends JwtPayload {
    auth: string
    profileImage?: string | null
    demo?: boolean
}

interface UserInfo {
    email: string
    role: string
    profileImage: string | null
}

export interface LogoutOptions {
    /** The account was withdrawn: also drop its in-progress workout and failed-save backup. */
    withdrawn?: boolean
}

interface AuthState {
    token: string | null
    user: UserInfo | null
    isLoading: boolean // 추가: 초기화 여부 체크
    setIsLoading: (loading: boolean) => void
    setToken: (token: string) => void
    logout: (options?: LogoutOptions) => void
    clearToken: () => void
}

function writeRoleCookie(decoded: FitCoreJwt) {
    if (typeof document === "undefined") return
    document.cookie = buildRoleCookie(decoded.auth ?? "", decoded.exp)
}

function clearRoleCookie() {
    if (typeof document === "undefined") return
    document.cookie = CLEAR_ROLE_COOKIE
}

/**
 * Login side effects on device data.
 * - A real-account login ends any demo session (demo-only keys; demo workout keys only if demo was on).
 * - The in-progress workout and failed-save backup stay for the same account and are cleared when a
 *   different real account logs in.
 * - A demo login never deletes a real account's workout or backup: the login page sets them aside before
 *   seeding (preservingFailedWorkoutSave), claimAccountData sets aside anything left and keeps only the
 *   demo's seeded keys, and the real account's next login restores them (utils/accountScopedStorage).
 * - The supplement chat is cleared on an account switch.
 */
export function applyLoginToDeviceData(decoded: Pick<FitCoreJwt, "sub" | "demo">): void {
    if (!decoded.demo) clearDemoSession()
    const result = claimAccountData(decoded.sub, { isDemo: decoded.demo === true })
    if (result === "switched") clearSupplementChat()
}

/**
 * Account-scoped data removed on withdrawal: workout data, failed-save backup, owner marker, supplement chat.
 * Exported for withdraw handlers that do not go through logout({ withdrawn: true }).
 */
export function clearWithdrawnAccountData(): void {
    forgetAccountData()
    clearSupplementChat()
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
                applyLoginToDeviceData(decoded)
                writeRoleCookie(decoded)
                set({
                    token,
                    user: {
                        email: decoded.sub ?? "",
                        role: decoded.auth,
                        profileImage: decoded.profileImage ?? null,
                    },
                })
            },
            // Keeps the in-progress workout and failed-save backup (owned by the account, see
            // utils/accountScopedStorage) so the same account can resume after logging in again.
            logout: (options?: LogoutOptions) => {
                clearDemoSession()
                clearSupplementChat()
                if (options?.withdrawn === true) forgetAccountData()
                clearRoleCookie()
                set({ token: null, user: null })
            },
            clearToken: () => {
                clearRoleCookie()
                set({ token: null })
            },
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            // 초기화 시점에 isLoading을 true로 유지하기 위해 부분적으로만 저장할 수도 있음
            partialize: (state) => ({ token: state.token, user: state.user }),
            // Re-set the role cookie from the persisted token so /admin (proxy.ts) keeps working
            // after a browser restart dropped the cookie.
            onRehydrateStorage: () => (state) => {
                if (!state?.token) return
                try {
                    const decoded = jwtDecode<FitCoreJwt>(state.token)
                    // Sessions from before the owner marker existed: tag the device data with this account.
                    backfillAccountOwner(decoded.sub)
                    if (decoded.exp && decoded.exp * 1000 <= Date.now()) return
                    writeRoleCookie(decoded)
                } catch {
                    // invalid token: AuthInitializer/AuthProvider will log out
                }
            },
        }
    )
)
