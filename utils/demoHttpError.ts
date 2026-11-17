import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

/**
 * An AxiosError shaped like the backend's error response, for demo-mode stores that answer locally.
 * Pages branch on `error instanceof AxiosError && error.response?.status` (and httpStatusOf reads
 * response.status), so a demo rejection must look exactly like a real HTTP failure.
 */
export function demoHttpError(status: number, code: string, message: string): AxiosError {
    const config = { headers: {} } as InternalAxiosRequestConfig
    const response: AxiosResponse = {
        status,
        statusText: "",
        data: { status, code, message },
        headers: {},
        config,
    }
    return new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, undefined, response)
}
