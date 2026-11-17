import { describe, expect, it, vi } from "vitest"
import { OFFLINE_MESSAGE, readOnlineStatus, serverOnlineStatus, subscribeOnlineStatus } from "../../components/OfflineBanner"

describe("online status store (OfflineBanner)", () => {
    it("reads navigator.onLine and treats a missing navigator as online", () => {
        expect(readOnlineStatus({ onLine: true })).toBe(true)
        expect(readOnlineStatus({ onLine: false })).toBe(false)
        expect(readOnlineStatus(undefined)).toBe(true)
    })

    it("server snapshot is online so SSR never renders the banner", () => {
        expect(serverOnlineStatus()).toBe(true)
    })

    it("subscribes to online/offline events and unsubscribes both", () => {
        const target = new EventTarget()
        const onChange = vi.fn()
        const unsubscribe = subscribeOnlineStatus(onChange, target as unknown as Window)

        target.dispatchEvent(new Event("offline"))
        target.dispatchEvent(new Event("online"))
        expect(onChange).toHaveBeenCalledTimes(2)

        unsubscribe()
        target.dispatchEvent(new Event("offline"))
        target.dispatchEvent(new Event("online"))
        expect(onChange).toHaveBeenCalledTimes(2)
    })

    it("is a no-op without a window", () => {
        const unsubscribe = subscribeOnlineStatus(vi.fn(), undefined)
        expect(() => unsubscribe()).not.toThrow()
    })

    it("uses the agreed Korean copy", () => {
        expect(OFFLINE_MESSAGE).toBe("인터넷 연결이 끊겼어요. 연결되면 다시 시도해 주세요.")
    })
})
