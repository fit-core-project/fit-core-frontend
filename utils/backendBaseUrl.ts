export const getBackendBaseUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL

    if (!baseUrl) {
        throw new Error("Backend base URL is not configured")
    }

    return baseUrl.replace(/\/$/, "")
}
