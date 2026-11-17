import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
    RETURN_PATH_STORAGE_KEY,
    consumeManualLogout,
    markManualLogout,
    rememberReturnPath,
} from "@/lib/axios/authRedirect"

class MemoryStorage {
    private data = new Map<string, string>()
    getItem(key: string) {
        return this.data.has(key) ? (this.data.get(key) as string) : null
    }
    setItem(key: string, value: string) {
        this.data.set(key, String(value))
    }
    removeItem(key: string) {
        this.data.delete(key)
    }
}

const g = globalThis as unknown as { window?: unknown; sessionStorage?: MemoryStorage }

describe("manual logout return path", () => {
    beforeEach(() => {
        g.window = {}
        g.sessionStorage = new MemoryStorage()
    })
    afterEach(() => {
        delete g.window
        delete g.sessionStorage
    })

    it("drops the remembered page and is consumed once", () => {
        rememberReturnPath("/my")
        expect(g.sessionStorage?.getItem(RETURN_PATH_STORAGE_KEY)).toBe("/my")

        markManualLogout()
        expect(g.sessionStorage?.getItem(RETURN_PATH_STORAGE_KEY)).toBeNull()
        expect(consumeManualLogout()).toBe(true)
        expect(consumeManualLogout()).toBe(false)
    })

    it("is false when the session simply expired", () => {
        expect(consumeManualLogout()).toBe(false)
    })
})
