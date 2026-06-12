import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosRequestHeaders,
    AxiosRequestTransformer,
    AxiosResponse,
} from "axios"
import qs from "qs"
import { isNotEmpty } from "@/lib/utill/DataUtil"

export interface IAxiosController extends AxiosInstance {
    defaults: AxiosInstance["defaults"]
    request<T = unknown, _R = AxiosResponse<T>, D = unknown>(config: AxiosRequestConfig<D>): Promise<T>
    get<T = unknown, _R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    delete<T = unknown, _R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    multipleDelete?<T = unknown, _R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    head<T = unknown, _R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    options<T = unknown, _R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    post<T = unknown, _R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    put<T = unknown, _R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    patch<T = unknown, _R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    postForm<T = unknown, _R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    putForm<T = unknown, _R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    patchForm<T = unknown, _R = AxiosResponse<T>, D = unknown>(
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
    timeout: 500000,
    onUploadProgress: (_progressEvent: unknown) => {},
    onDownloadProgress: (_progressEvent: unknown) => {},
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

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// [추가] 응답 인터셉터: 401 발생 시 로그아웃 처리
AxiosController.interceptors.response.use(
    (response) => response.data, // response.data만 바로 반환하도록 설정하면 편리합니다!
    async (error) => {
        if (error.response?.status === 401) {
            // 토큰 만료 또는 인증 실패 시 로직
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth-storage")
                window.location.href = "/login"
            }
        }
        return Promise.reject(error)
    }
)

AxiosController.multipleDelete = async function <T = unknown, _R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
): Promise<T> {
    return this.delete(url, { ...config, data })
}

export default AxiosController
