"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { WifiOff } from "lucide-react"

export const OFFLINE_MESSAGE = "인터넷 연결이 끊겼어요. 연결되면 다시 시도해 주세요."

type OnlineEventTarget = Pick<Window, "addEventListener" | "removeEventListener">

/** Subscribes to the browser's online/offline events; returns the unsubscribe function. */
export function subscribeOnlineStatus(onChange: () => void, target: OnlineEventTarget | undefined = globalThis.window): () => void {
    if (!target) return () => {}
    target.addEventListener("online", onChange)
    target.addEventListener("offline", onChange)
    return () => {
        target.removeEventListener("online", onChange)
        target.removeEventListener("offline", onChange)
    }
}

/** navigator.onLine, treating a missing navigator (or onLine) as online. */
export function readOnlineStatus(nav: Pick<Navigator, "onLine"> | undefined = globalThis.navigator): boolean {
    return nav?.onLine !== false
}

/** Server render and hydration assume online, so the banner never appears in the SSR markup. */
export function serverOnlineStatus(): boolean {
    return true
}

const subscribe = (onChange: () => void) => subscribeOnlineStatus(onChange)
const getSnapshot = () => readOnlineStatus()

/**
 * Global offline notice floating above the bottom nav / main action. It is not interactive, so it never blocks a control.
 * The live region stays mounted while online so screen readers announce the message when it appears.
 */
export default function OfflineBanner() {
    const online = useSyncExternalStore(subscribe, getSnapshot, serverOnlineStatus)

    return (
        <div
            role="status"
            aria-live="polite"
            // Bottom pill above the tab bar / main action, above every layer (z-[60]) and never clickable:
            // a top banner hid behind the header and covered the player's exit/finish buttons.
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] mx-auto w-full max-w-[480px] px-4"
        >
            {!online && <OfflinePill />}
        </div>
    )
}

/** Full message first, then a small chip so it stops hiding the content behind it. */
export const OFFLINE_COMPACT_AFTER_MS = 6000

function OfflinePill() {
    // Mounted only while offline, so every new offline period starts with the full message.
    const [compact, setCompact] = useState(false)
    useEffect(() => {
        const id = window.setTimeout(() => setCompact(true), OFFLINE_COMPACT_AFTER_MS)
        return () => window.clearTimeout(id)
    }, [])

    if (compact) {
        return (
            <p className="ml-auto flex min-h-8 w-fit items-center gap-1.5 rounded-full border border-danger/30 bg-danger-bg px-3 py-1 text-caption font-bold text-danger-ink shadow-sm">
                <WifiOff className="size-3.5 shrink-0" aria-hidden />
                <span aria-hidden>오프라인</span>
                <span className="sr-only">{OFFLINE_MESSAGE}</span>
            </p>
        )
    }
    return (
        <p className="flex min-h-11 items-center gap-2.5 rounded-panel border border-danger/30 bg-danger-bg px-3 py-2.5 text-body-sm font-medium text-danger-ink shadow-sm">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{OFFLINE_MESSAGE}</span>
        </p>
    )
}
