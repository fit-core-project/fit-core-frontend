import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosRequestHeaders,
    AxiosRequestTransformer,
} from "axios"
import qs from "qs"
import { toast } from "sonner"
import { isNotEmpty } from "@/lib/utill/DataUtil"
import { useAuthStore } from "@/store/authStore"
import { buildLoginUrl, isUnsavedWorkPath, rememberReturnPath } from "@/lib/axios/authRedirect"
import {
    AUTH_EXPIRED_FLAG,
    isCanceledError,
    isWorkoutSaveRequest,
    timeoutFor,
} from "@/lib/axios/requestPolicy"

export {
    AI_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    aiRequestConfig,
    createRequestController,
    isAuthExpiredError,
    isCanceledError,
    isTimeoutError,
} from "@/lib/axios/requestPolicy"

export interface IAxiosController extends AxiosInstance {
    defaults: AxiosInstance["defaults"]
    request<T = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<T>
    get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    multipleDelete?<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    head<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    options<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    post<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    put<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    patch<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    postForm<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    putForm<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    patchForm<T = unknown, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
}

const dateTransformer = (data: unknown, header: AxiosRequestHeaders): unknown => {
    if (data instanceof FormData) {
        return data
    } else if (data instanceof Date) {
        return data
    } else if (data instanceof File) {
        return data
    } else if (Array.isArray(data)) {
        return data.map((value) => dateTransformer(value, header))
    } else if (data !== null && typeof data === "object" && isNotEmpty(data)) {
        return Object.fromEntries(
            Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, dateTransformer(value, header)])
        )
    }
    return data
}

const AxiosController: IAxiosController = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL,
    withCredentials: true,
    paramsSerializer: (params: unknown) => {
        return qs.stringify(params, { arrayFormat: "repeat" })
    },
    transformRequest: [
        dateTransformer,
        ...(Array.isArray(axios.defaults.transformRequest)
            ? axios.defaults.transformRequest
            : ([axios.defaults.transformRequest] as AxiosRequestTransformer[])),
    ],
    // No instance timeout: the request interceptor picks one per URL (30s default, 90s for AI calls).
    onUploadProgress: () => {},
    onDownloadProgress: () => {},
})

AxiosController.interceptors.request.use(
    (config) => {
        // 토큰 가져옴
        const authStorage = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null

        if (authStorage) {
            try {
                const parsedStorage = JSON.parse(authStorage)
                // 구조 확인: parsedStorage.state.token 입니다.
                const token = parsedStorage.state?.token

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
            } catch (e) {
                console.error("토큰 파싱 에러:", e)
            }
        }

        config.timeout = timeoutFor(config.url, config.timeout)

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

const SESSION_EXPIRED_MESSAGE = "로그인이 만료됐어요"
const HARD_REDIRECT_DELAY_MS = 1200
let handlingExpiry = false

function currentPath(): string {
    return `${window.location.pathname}${window.location.search}`
}

/**
 * Sends the user to /login and remembers where they were. Safe to call from pages
 * (e.g. the workout player's "다시 로그인" button after it has kept its payload).
 */
export function redirectToLogin(returnPath?: string): void {
    if (typeof window === "undefined") return
    const target = returnPath ?? currentPath()
    rememberReturnPath(target)
    if (window.location.pathname === "/login") return
    window.location.assign(buildLoginUrl(target))
}

function handleSessionExpired() {
    if (handlingExpiry) return
    handlingExpiry = true
    const returnPath = currentPath()
    rememberReturnPath(returnPath)
    toast.error(SESSION_EXPIRED_MESSAGE, { description: "다시 로그인해 주세요.", id: "session-expired" })
    // Clears token, user and the fit-core-role cookie. The route guard soft-navigates protected
    // pages to /login (the toast survives that); public pages get a delayed hard redirect.
    useAuthStore.getState().logout()
    window.setTimeout(() => {
        handlingExpiry = false
        if (window.location.pathname !== "/login") {
            window.location.assign(buildLoginUrl(returnPath))
        }
    }, HARD_REDIRECT_DELAY_MS)
}

// [추가] 응답 인터셉터: 401 발생 시 로그아웃 처리
AxiosController.interceptors.response.use(
    (response) => response.data, // response.data만 바로 반환하도록 설정하면 편리합니다!
    async (error) => {
        if (isCanceledError(error)) return Promise.reject(error)

        if (error?.response?.status === 401 && typeof window !== "undefined") {
            error[AUTH_EXPIRED_FLAG] = true
            const hadToken = Boolean(error.config?.headers?.Authorization)
            // Workout save, or any call made from the player: keep the token and stay on the page so
            // the player keeps its payload and offers re-login (see redirectToLogin / isAuthExpiredError).
            const keepSession =
                isWorkoutSaveRequest(error.config?.method, error.config?.url) ||
                isUnsavedWorkPath(window.location.pathname)
            if (hadToken && !keepSession) {
                handleSessionExpired()
            }
        }
        return Promise.reject(error)
    }
)

AxiosController.multipleDelete = async function <T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
): Promise<T> {
    return this.delete(url, { ...config, data })
}

export default AxiosController
