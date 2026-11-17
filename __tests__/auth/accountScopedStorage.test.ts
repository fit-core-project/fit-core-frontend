import { describe, expect, it } from "vitest"
import {
    ACCOUNT_OWNER_KEY,
    backfillAccountOwner,
    claimAccountData,
    confirmFailedSaveOwnership,
    confirmWorkoutOwnership,
    DEMO_SET_ASIDE_KEY,
    forgetAccountData,
    isOwnedByAccount,
    readAccountOwner,
    readFailedSaveFor,
    readFailedSaveOffer,
    setAsideAccountDataForDemo,
    UNCONFIRMED_WORKOUT_KEY,
    workoutOwnershipFor,
    writeOwnedFailedSave,
} from "@/utils/accountScopedStorage"
import { parseFailedSave } from "@/utils/activeWorkout"
import { clearDemoSession, DEMO_MODE_STORAGE_KEY } from "@/utils/demoMode"
import { clearSupplementChat, SUPPLEMENT_CHAT_STORAGE_KEY } from "@/utils/supplementChatStorage"

class MemoryStorage {
    private map = new Map<string, string>()
    getItem(key: string) {
        return this.map.has(key) ? (this.map.get(key) as string) : null
    }
    setItem(key: string, value: string) {
        this.map.set(key, String(value))
    }
    removeItem(key: string) {
        this.map.delete(key)
    }
    has(key: string) {
        return this.map.has(key)
    }
}

const FAILED = JSON.stringify({
    payload: { workoutDate: "2026-11-17", splitLabel: "Push", sets: [{ setIndex: 1, reps: 5 }] },
    reason: "auth",
    routineId: "final-1",
    programId: null,
    failedAt: 1,
})

/** Every key of an in-progress workout plus a failed save. */
function seedWorkout(s: MemoryStorage) {
    s.setItem("fitcore_active_routine", JSON.stringify({ routineDraftId: "d1", routineBlocks: [] }))
    s.setItem("fitcore_routine_final_id", "final-1")
    s.setItem("fitcore_split_label", "push")
    s.setItem("fitcore_player_progress", JSON.stringify({ routineId: "final-1", checkedSets: ["0-0"], startedAt: 1, rest: { endsAt: 2, pausedAt: null } }))
    s.setItem("fitcore_program_context", JSON.stringify({ programId: "p", programItemId: "i", routineFinalId: "final-1" }))
    s.setItem("fitcore_doms_data", "{}")
    s.setItem("fitcore_pain_areas", "[]")
    s.setItem("fitcore_failed_workout_save", FAILED)
}

const WORKOUT_KEYS = [
    "fitcore_active_routine",
    "fitcore_routine_final_id",
    "fitcore_split_label",
    "fitcore_player_progress",
    "fitcore_program_context",
    "fitcore_doms_data",
    "fitcore_pain_areas",
    "fitcore_failed_workout_save",
]

describe("claimAccountData", () => {
    it("keeps the workout when the same account logs in again (case-insensitive sub)", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        seedWorkout(s)
        expect(claimAccountData("A@x.com ", {}, s)).toBe("same")
        WORKOUT_KEYS.forEach((key) => expect(s.has(key)).toBe(true))
    })

    it("adopts legacy data with no owner instead of deleting it, but only as unconfirmed", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        expect(claimAccountData("a@x.com", {}, s)).toBe("adopted")
        expect(readAccountOwner(s)).toBe("a@x.com")
        WORKOUT_KEYS.forEach((key) => expect(s.has(key)).toBe(true))
        expect(workoutOwnershipFor("a@x.com", s)).toBe("unconfirmed")
        expect(readFailedSaveOffer("a@x.com", s)?.needsConfirm).toBe(true)
    })

    it("clears the workout and failed save when a different account logs in", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        seedWorkout(s)
        s.setItem("fitcore_unavailable_equipment", "[]")
        expect(claimAccountData("b@x.com", {}, s)).toBe("switched")
        expect(readAccountOwner(s)).toBe("b@x.com")
        ;[...WORKOUT_KEYS, "fitcore_unavailable_equipment"].forEach((key) => expect(s.has(key)).toBe(false))
    })

    it("sets the real account's workout aside (not deleted) on a switch to demo, and restores it for that account", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        seedWorkout(s)
        // claim-time fallback only: the seeded keys hold demo data by now, the rest is moved aside
        const notSeeded = ["fitcore_routine_final_id", "fitcore_player_progress", "fitcore_program_context", "fitcore_failed_workout_save"]
        expect(claimAccountData("demo@fit-core.local", { isDemo: true }, s)).toBe("switched")
        notSeeded.forEach((key) => expect(s.has(key)).toBe(false))
        expect(s.has("fitcore_active_routine")).toBe(true)
        const aside = JSON.parse(s.getItem(DEMO_SET_ASIDE_KEY) ?? "{}")
        expect(aside.owner).toBe("a@x.com")
        expect(aside.items["fitcore_failed_workout_save"]).toBe(FAILED)
        expect(aside.items["fitcore_active_routine"]).toBeUndefined()

        expect(claimAccountData("a@x.com", {}, s)).toBe("switched")
        notSeeded.forEach((key) => expect(s.has(key)).toBe(true))
        expect(s.getItem("fitcore_failed_workout_save")).toBe(FAILED)
        expect(s.has(DEMO_SET_ASIDE_KEY)).toBe(false)
        expect(workoutOwnershipFor("a@x.com", s)).toBe("own")
    })

    it("keeps the demo's seeded keys when the real data was set aside before seeding", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        seedWorkout(s)
        setAsideAccountDataForDemo(s)
        // seedDemoSession
        s.setItem("fitcore_demo_mode", "true")
        s.setItem("fitcore_active_routine", JSON.stringify({ routineDraftId: "demo", routineBlocks: [] }))
        s.setItem("fitcore_split_label", "demo")
        expect(claimAccountData("demo@fit-core.local", { isDemo: true }, s)).toBe("switched")
        expect(JSON.parse(s.getItem("fitcore_active_routine") ?? "{}").routineDraftId).toBe("demo")
        expect(s.getItem("fitcore_split_label")).toBe("demo")
        expect(JSON.parse(s.getItem(DEMO_SET_ASIDE_KEY) ?? "{}").items["fitcore_active_routine"]).toContain("d1")
    })

    it("does not replace the set-aside on a second demo login, and drops it for a different real account", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        seedWorkout(s)
        claimAccountData("demo@fit-core.local", { isDemo: true }, s)
        const first = s.getItem(DEMO_SET_ASIDE_KEY)
        // demo logout (demo mode flag cleared) then demo login again with fresh demo data
        s.setItem("fitcore_active_routine", JSON.stringify({ routineDraftId: "demo", routineBlocks: [] }))
        setAsideAccountDataForDemo(s)
        expect(claimAccountData("demo@fit-core.local", { isDemo: true }, s)).toBe("same")
        expect(s.getItem(DEMO_SET_ASIDE_KEY)).toBe(first)

        expect(claimAccountData("b@x.com", {}, s)).toBe("switched")
        expect(s.has(DEMO_SET_ASIDE_KEY)).toBe(false)
        WORKOUT_KEYS.forEach((key) => expect(s.has(key)).toBe(false))
    })

    it("restores set-aside data with no recorded owner as unconfirmed", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        setAsideAccountDataForDemo(s)
        claimAccountData("demo@fit-core.local", { isDemo: true }, s)
        claimAccountData("a@x.com", {}, s)
        expect(s.has("fitcore_active_routine")).toBe(true)
        expect(workoutOwnershipFor("a@x.com", s)).toBe("unconfirmed")
        expect(readFailedSaveOffer("a@x.com", s)?.needsConfirm).toBe(true)
    })

    it("ignores an empty subject", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        expect(claimAccountData("", {}, s)).toBe("same")
        expect(readAccountOwner(s)).toBeNull()
    })
})

describe("ownership checks", () => {
    it("offers the failed save only to its owner", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        s.setItem("fitcore_failed_workout_save", FAILED)
        expect(readFailedSaveFor("a@x.com", s)?.routineId).toBe("final-1")
        expect(readFailedSaveFor("b@x.com", s)).toBeNull()
        expect(readFailedSaveFor(null, s)).toBeNull()
        expect(isOwnedByAccount("b@x.com", s)).toBe(false)
    })

    it("backfills the owner only when missing, without marking the workout unconfirmed", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        backfillAccountOwner("a@x.com", s)
        backfillAccountOwner("b@x.com", s)
        expect(readAccountOwner(s)).toBe("a@x.com")
        expect(workoutOwnershipFor("a@x.com", s)).toBe("own")
        expect(s.has(UNCONFIRMED_WORKOUT_KEY)).toBe(false)
    })

    it("forgets everything on withdrawal", () => {
        const s = new MemoryStorage()
        s.setItem(ACCOUNT_OWNER_KEY, "a@x.com")
        seedWorkout(s)
        forgetAccountData(s)
        WORKOUT_KEYS.forEach((key) => expect(s.has(key)).toBe(false))
        expect(s.has(ACCOUNT_OWNER_KEY)).toBe(false)
    })
})

describe("clearDemoSession", () => {
    it("keeps a real account's in-progress workout and failed save (logout / token expiry)", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        s.setItem("fitcore_demo_profile", "{}")
        clearDemoSession(s)
        WORKOUT_KEYS.forEach((key) => expect(s.has(key)).toBe(true))
        expect(s.has("fitcore_demo_profile")).toBe(false)
    })

    it("removes the demo's seeded workout keys while demo mode is on", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        s.setItem(DEMO_MODE_STORAGE_KEY, "true")
        clearDemoSession(s)
        WORKOUT_KEYS.forEach((key) => expect(s.has(key)).toBe(false))
        expect(s.has(DEMO_MODE_STORAGE_KEY)).toBe(false)
    })
})

describe("clearSupplementChat", () => {
    it("removes the stored chat", () => {
        const s = new MemoryStorage()
        s.setItem(SUPPLEMENT_CHAT_STORAGE_KEY, "[]")
        clearSupplementChat(s)
        expect(s.has(SUPPLEMENT_CHAT_STORAGE_KEY)).toBe(false)
    })
})

describe("failed-save backup with an embedded owner (P2-2)", () => {
    const entry = parseFailedSave(FAILED)!

    it("embeds the owner sub when written and offers it only to that account", () => {
        const s = new MemoryStorage()
        writeOwnedFailedSave(entry, " A@x.com", s)
        expect(JSON.parse(s.getItem("fitcore_failed_workout_save") ?? "{}").ownerSub).toBe("a@x.com")
        expect(readFailedSaveOffer("a@x.com", s)).toEqual({ entry, needsConfirm: false })
        // even when the device marker was adopted by someone else
        s.setItem(ACCOUNT_OWNER_KEY, "b@x.com")
        expect(readFailedSaveOffer("b@x.com", s)).toBeNull()
        expect(readFailedSaveFor("b@x.com", s)).toBeNull()
    })

    it("asks for confirmation on a legacy backup with no owner (both stored formats)", () => {
        const s = new MemoryStorage()
        s.setItem("fitcore_failed_workout_save", FAILED)
        expect(readFailedSaveOffer("b@x.com", s)?.needsConfirm).toBe(true)
        s.setItem("fitcore_failed_workout_save", JSON.stringify({ workoutDate: "2026-11-17", sets: [{ setIndex: 1, reps: 5 }] }))
        expect(readFailedSaveOffer("b@x.com", s)?.needsConfirm).toBe(true)
        // the player still sees it and sends the user home, where the prompt asks
        expect(readFailedSaveFor("b@x.com", s)).not.toBeNull()
    })

    it("stamps the confirming account into a legacy backup", () => {
        const s = new MemoryStorage()
        s.setItem("fitcore_failed_workout_save", FAILED)
        confirmFailedSaveOwnership("b@x.com", s)
        expect(readFailedSaveOffer("b@x.com", s)?.needsConfirm).toBe(false)
        expect(readFailedSaveOffer("a@x.com", s)).toBeNull()
        // an owned backup is never re-stamped
        confirmFailedSaveOwnership("a@x.com", s)
        expect(JSON.parse(s.getItem("fitcore_failed_workout_save") ?? "{}").ownerSub).toBe("b@x.com")
    })
})

describe("unowned in-progress workout (P2-2)", () => {
    it("an adopted workout is unconfirmed until confirmed", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        claimAccountData("a@x.com", {}, s)
        expect(workoutOwnershipFor("a@x.com", s)).toBe("unconfirmed")
        expect(isOwnedByAccount("a@x.com", s)).toBe(true)
        confirmWorkoutOwnership("a@x.com", s)
        expect(workoutOwnershipFor("a@x.com", s)).toBe("own")
    })

    it("the mark applies only to the adopted workout, not to one started later", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        claimAccountData("a@x.com", {}, s)
        s.setItem("fitcore_active_routine", JSON.stringify({ routineDraftId: "d2", routineBlocks: [] }))
        s.setItem("fitcore_routine_final_id", "final-2")
        expect(workoutOwnershipFor("a@x.com", s)).toBe("own")
    })

    it("an account switch clears the unconfirmed mark with the data", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        claimAccountData("a@x.com", {}, s)
        claimAccountData("b@x.com", {}, s)
        expect(s.has(UNCONFIRMED_WORKOUT_KEY)).toBe(false)
        expect(workoutOwnershipFor("a@x.com", s)).toBe("other")
    })

    it("no recorded owner at all reads as unconfirmed, another owner as other", () => {
        const s = new MemoryStorage()
        seedWorkout(s)
        expect(workoutOwnershipFor("a@x.com", s)).toBe("unconfirmed")
        s.setItem(ACCOUNT_OWNER_KEY, "b@x.com")
        expect(workoutOwnershipFor("a@x.com", s)).toBe("other")
        expect(workoutOwnershipFor(null, s)).toBe("other")
    })
})
