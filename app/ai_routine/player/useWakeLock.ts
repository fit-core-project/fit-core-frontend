import { useEffect } from "react"

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> }
type WakeLockLike = { request: (type: "screen") => Promise<WakeLockSentinelLike> }

/** Keeps the screen on while `active`; re-acquires after the tab becomes visible again. No-op if unsupported. */
export function useWakeLock(active: boolean): void {
    useEffect(() => {
        if (!active || typeof navigator === "undefined") return
        const wakeLock = (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock
        if (!wakeLock) return

        let sentinel: WakeLockSentinelLike | null = null
        let disposed = false

        const acquire = async () => {
            if (disposed || document.visibilityState !== "visible") return
            if (sentinel && !sentinel.released) return
            try {
                const next = await wakeLock.request("screen")
                if (disposed) void next.release().catch(() => {})
                else sentinel = next
            } catch {
                /* denied (battery saver, permissions policy): the screen may sleep */
            }
        }

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") void acquire()
        }

        void acquire()
        document.addEventListener("visibilitychange", onVisibilityChange)
        return () => {
            disposed = true
            document.removeEventListener("visibilitychange", onVisibilityChange)
            if (sentinel && !sentinel.released) void sentinel.release().catch(() => {})
            sentinel = null
        }
    }, [active])
}
