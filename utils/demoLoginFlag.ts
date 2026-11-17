/**
 * NEXT_PUBLIC_ENABLE_DEMO_LOGIN: "true" shows the demo login, "false" hides it.
 * Unset: shown in development, hidden in production builds, so forgetting the flag never exposes it.
 */
export function isDemoLoginEnabled(
    flag: string | undefined = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN,
    nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
    if (flag === "true") return true
    if (flag === "false") return false
    return nodeEnv !== "production"
}
