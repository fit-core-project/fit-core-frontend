import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from "axios"
import qs from "qs"
import { isNotEmpty } from "@/app/common/utill/DataUtil"

export interface IAxiosController extends AxiosInstance {
    defaults: any
    request<T = unknown, R = AxiosResponse<T>, D = unknown>(config: AxiosRequestConfig<D>): Promise<T>
    get<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    delete<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    multipleDelete?<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    head<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    options<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
    post<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    put<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    patch<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    postForm<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    putForm<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<T>
    patchForm<T = unknown, R = AxiosResponse<T>, D = unknown>(
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
    } else if (typeof data === "object" && isNotEmpty(data)) {
        return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, dateTransformer(value, header)]))
    }
    return data
}

const AxiosController: IAxiosController = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    withCredentials: true,
    paramsSerializer: (params: unknown) => {
        return qs.stringify(params, { arrayFormat: "repeat" })
    },
    transformRequest: Array.isArray(axios.defaults.transformRequest)
        ? [dateTransformer, ...axios.defaults.transformRequest]
        : [dateTransformer, axios.defaults.transformRequest],
    timeout: 500000,
    onUploadProgress: (progressEvent: unknown) => {},
    onDownloadProgress: (progressEvent: unknown) => {},
})

AxiosController.multipleDelete = async function <T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
): Promise<T> {
    return this.delete(url, { ...config, data })
}

export default AxiosController
