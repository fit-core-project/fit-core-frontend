import { beforeEach, describe, expect, it, vi } from "vitest"

class MemoryStorage {
    private map = new Map<string, string>()
    get length() {
        return this.map.size
    }
    key(i: number) {
        return [...this.map.keys()][i] ?? null
    }
    getItem(key: string) {
        return this.map.has(key) ? (this.map.get(key) as string) : null
    }
    setItem(key: string, value: string) {
        this.map.set(key, String(value))
    }
    removeItem(key: string) {
        this.map.delete(key)
    }
    clear() {
        this.map.clear()
    }
}

const local = new MemoryStorage()
const session = new MemoryStorage()
vi.stubGlobal("localStorage", local)
vi.stubGlobal("sessionStorage", session)
vi.stubGlobal("window", { localStorage: local, sessionStorage: session })

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
const token = (sub: string, extra: Record<string, unknown> = {}) =>
    [encode({ alg: "none" }), encode({ sub, auth: "ROLE_USER", exp: Math.floor(Date.now() / 1000) + 3600, ...extra }), "sig"].join(".")

const { useAuthStore } = await import("@/store/authStore")

function seedWorkout() {
    local.setItem("fitcore_active_routine", JSON.stringify({ routineDraftId: "d1", routineBlocks: [] }))
    local.setItem("fitcore_routine_final_id", "final-1")
    local.setItem("fitcore_split_label", "push")
    local.setItem("fitcore_player_progress", JSON.stringify({ routineId: "final-1", checkedSets: ["0-0"], startedAt: 1, rest: null }))
    local.setItem("fitcore_program_context", JSON.stringify({ programId: "p", programItemId: "i", routineFinalId: "final-1" }))
    local.setItem("fitcore_failed_workout_save", JSON.stringify({ payload: { sets: [{}] }, reason: "auth", routineId: "final-1" }))
}

describe("auth store and account-scoped device data", () => {
    beforeEach(() => {
        local.clear()
        session.clear()
        useAuthStore.setState({ token: null, user: null })
    })

    it("logout + same-account login keeps the in-progress workout; the supplement chat is cleared on logout", () => {
        useAuthStore.getState().setToken(token("a@x.com"))
        seedWorkout()
        session.setItem("fitcore_supplement_chat_v1", "[]")
        useAuthStore.getState().logout()
        expect(local.getItem("fitcore_active_routine")).not.toBeNull()
        expect(local.getItem("fitcore_player_progress")).not.toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).not.toBeNull()
        expect(session.getItem("fitcore_supplement_chat_v1")).toBeNull()

        useAuthStore.getState().setToken(token("a@x.com"))
        expect(local.getItem("fitcore_active_routine")).not.toBeNull()
        expect(local.getItem("fitcore_routine_final_id")).toBe("final-1")
        expect(local.getItem("fitcore_program_context")).not.toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).not.toBeNull()
    })

    it("a different account's login clears the workout, the backup and the chat", () => {
        useAuthStore.getState().setToken(token("a@x.com"))
        seedWorkout()
        session.setItem("fitcore_supplement_chat_v1", "[]")
        useAuthStore.getState().setToken(token("b@x.com"))
        expect(local.getItem("fitcore_active_routine")).toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).toBeNull()
        expect(session.getItem("fitcore_supplement_chat_v1")).toBeNull()
        expect(local.getItem("fitcore_account_owner")).toBe("b@x.com")
    })

    it("withdrawal clears the account's workout data and owner", () => {
        useAuthStore.getState().setToken(token("a@x.com"))
        seedWorkout()
        useAuthStore.getState().logout({ withdrawn: true })
        expect(local.getItem("fitcore_active_routine")).toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).toBeNull()
        expect(local.getItem("fitcore_account_owner")).toBeNull()
    })

    it("demo login keeps its seeded routine and sets the previous account's data aside instead of deleting it", () => {
        useAuthStore.getState().setToken(token("a@x.com"))
        seedWorkout()
        // a path that seeds without the login page's set-aside: claimAccountData still must not delete A's data
        local.setItem("fitcore_demo_mode", "true")
        local.setItem("fitcore_active_routine", JSON.stringify({ routineDraftId: "demo-draft-001", routineBlocks: [] }))
        useAuthStore.getState().setToken(token("demo@fit-core.local", { demo: true }))
        expect(JSON.parse(local.getItem("fitcore_active_routine") ?? "{}").routineDraftId).toBe("demo-draft-001")
        expect(local.getItem("fitcore_failed_workout_save")).toBeNull()
        expect(local.getItem("fitcore_player_progress")).toBeNull()
        expect(local.getItem("fitcore_demo_mode")).toBe("true")
        const aside = JSON.parse(local.getItem("fitcore_demo_set_aside") ?? "{}")
        expect(aside.owner).toBe("a@x.com")
        expect(aside.items["fitcore_player_progress"]).toBeDefined()
        expect(aside.items["fitcore_failed_workout_save"]).toBeDefined()
    })

    it("real login, demo login (login page flow), logout, real login restores the workout and backup (P2-3)", async () => {
        const { preservingFailedWorkoutSave } = await import("@/lib/axios/authRedirect")
        const { seedDemoSession, createDemoToken } = await import("@/utils/demoMode")
        const { readFailedSaveOffer, workoutOwnershipFor, writeOwnedFailedSave } = await import("@/utils/accountScopedStorage")
        const { parseFailedSave } = await import("@/utils/activeWorkout")

        useAuthStore.getState().setToken(token("a@x.com"))
        seedWorkout()
        writeOwnedFailedSave(
            parseFailedSave(JSON.stringify({ payload: { workoutDate: "2026-11-17", sets: [{ setIndex: 1 }] }, reason: "auth", routineId: "final-1" }))!,
            "a@x.com",
        )
        const aRoutine = local.getItem("fitcore_active_routine")
        const aProgress = local.getItem("fitcore_player_progress")
        const aBackup = local.getItem("fitcore_failed_workout_save")
        useAuthStore.getState().logout()

        preservingFailedWorkoutSave(seedDemoSession)
        useAuthStore.getState().setToken(createDemoToken())
        // the demo sees only its own seeded data
        expect(local.getItem("fitcore_active_routine")).not.toBe(aRoutine)
        expect(local.getItem("fitcore_player_progress")).toBeNull()
        expect(local.getItem("fitcore_routine_final_id")).toBeNull()
        expect(local.getItem("fitcore_program_context")).toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).toBeNull()
        expect(readFailedSaveOffer(useAuthStore.getState().user?.email)).toBeNull()

        useAuthStore.getState().logout()
        useAuthStore.getState().setToken(token("a@x.com"))
        expect(local.getItem("fitcore_active_routine")).toBe(aRoutine)
        expect(local.getItem("fitcore_player_progress")).toBe(aProgress)
        expect(local.getItem("fitcore_routine_final_id")).toBe("final-1")
        expect(local.getItem("fitcore_program_context")).not.toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).toBe(aBackup)
        expect(local.getItem("fitcore_demo_set_aside")).toBeNull()
        expect(readFailedSaveOffer("a@x.com")?.needsConfirm).toBe(false)
        expect(workoutOwnershipFor("a@x.com")).toBe("own")
    })

    it("a different real account after the demo does not get the set-aside data", async () => {
        const { preservingFailedWorkoutSave } = await import("@/lib/axios/authRedirect")
        const { seedDemoSession, createDemoToken } = await import("@/utils/demoMode")
        useAuthStore.getState().setToken(token("a@x.com"))
        seedWorkout()
        useAuthStore.getState().logout()
        preservingFailedWorkoutSave(seedDemoSession)
        useAuthStore.getState().setToken(createDemoToken())
        useAuthStore.getState().logout()
        useAuthStore.getState().setToken(token("b@x.com"))
        expect(local.getItem("fitcore_active_routine")).toBeNull()
        expect(local.getItem("fitcore_failed_workout_save")).toBeNull()
        expect(local.getItem("fitcore_demo_set_aside")).toBeNull()
    })
})
