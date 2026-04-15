export const isNotEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return false
    if (typeof value === "string" && value.trim().length === 0) return false
    if (Array.isArray(value) && value.length === 0) return false
    return !(typeof value === "object" && Object.keys(value).length === 0)
}
