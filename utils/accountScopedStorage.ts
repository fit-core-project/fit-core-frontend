/**
 * Account ownership of the workout data kept on this device.
 *
 * The in-progress workout (routine, final id, split label, progress with start time and rest timer,
 * program context, condition inputs) and the failed-save backup belong to one account, not to a
 * login session. They survive token expiry, logout and re-login of the same account, and are
 * cleared when a different account logs in or the owner withdraws.
 *
 * Ownership is a single device-level marker (`fitcore_account_owner` = normalized JWT `sub`),
 * written on login and backfilled from a persisted token. Logout never clears it.
 *
 * - The failed-save backup also embeds its owner (`ownerSub`) when it is written. A backup without one
 *   (written before this existed) is offered only after the user confirms it is theirs.
 * - Legacy in-progress data adopted by a login (no owner recorded) is marked unconfirmed the same way.
 * - A demo login sets the real account's workout data aside under one namespaced key, and the next login
 *   of that account restores it. The demo only ever sees its own seeded keys.
 */
import {
    ACTIVE_ROUTINE_KEY,
    type FailedWorkoutSave,
    parseFailedSave,
    FAILED_SAVE_KEY,
    PLAYER_PROGRESS_KEY,
    ROUTINE_FINAL_ID_KEY,
    SPLIT_LABEL_KEY,
} from "@/utils/activeWorkout"
import { PROGRAM_CONTEXT_STORAGE_KEY } from "@/utils/programContext"

export const ACCOUNT_OWNER_KEY = "fitcore_account_owner"
/** Set while the owner marker is the demo account. */
export const DEMO_OWNER_FLAG_KEY = "fitcore_account_owner_demo"
/** `{ accountId, fingerprint }`: the in-progress workout was adopted by a login without a known owner. */
export const UNCONFIRMED_WORKOUT_KEY = "fitcore_workout_owner_unconfirmed"
/** A real account's workout data moved aside by a demo login: `{ owner, items: { key: raw } }`. */
export const DEMO_SET_ASIDE_KEY = "fitcore_demo_set_aside"
/** Same value as DEMO_MODE_STORAGE_KEY in utils/demoMode (not imported to keep demo code out of this module). */
const DEMO_MODE_KEY = "fitcore_demo_mode"

/** Condition-check inputs the player reads when it builds the save payload. */
export const CONDITION_INPUT_KEYS = ["fitcore_doms_data", "fitcore_pain_areas", "fitcore_unavailable_equipment"] as const

/** Keys that hold the in-progress workout. */
export const IN_PROGRESS_WORKOUT_KEYS = [
    ACTIVE_ROUTINE_KEY,
    ROUTINE_FINAL_ID_KEY,
    SPLIT_LABEL_KEY,
    PLAYER_PROGRESS_KEY,
    PROGRAM_CONTEXT_STORAGE_KEY,
    ...CONDITION_INPUT_KEYS,
] as const

/** Keys the demo login seeds itself (seedDemoSession); kept when switching to the demo account. */
const DEMO_SEEDED_KEYS: ReadonlySet<string> = new Set([ACTIVE_ROUTINE_KEY, SPLIT_LABEL_KEY, ...CONDITION_INPUT_KEYS])

type KeyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

function defaultStorage(): KeyStorage | null {
    if (typeof window === "undefined") return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function safeGet(storage: KeyStorage, key: string): string | null {
    try {
        return storage.getItem(key)
    } catch {
        return null
    }
}

function safeSet(storage: KeyStorage, key: string, value: string) {
    try {
        storage.setItem(key, value)
    } catch {
        // ignore
    }
}

function safeRemove(storage: KeyStorage, key: string) {
    try {
        storage.removeItem(key)
    } catch {
        // ignore
    }
}

function parseRecord(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null
    try {
        const data: unknown = JSON.parse(raw)
        return typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null
    } catch {
        return null
    }
}

/** JWT subject (email) normalized the same way as the onboarding flag key. */
export function normalizeAccountId(accountId: string | null | undefined): string | null {
    const trimmed = accountId?.trim().toLowerCase()
    return trimmed ? trimmed : null
}

export function readAccountOwner(storage: KeyStorage | null = defaultStorage()): string | null {
    if (!storage) return null
    return normalizeAccountId(safeGet(storage, ACCOUNT_OWNER_KEY))
}

export function writeAccountOwner(accountId: string | null | undefined, storage: KeyStorage | null = defaultStorage()): void {
    const id = normalizeAccountId(accountId)
    if (!id || !storage) return
    safeSet(storage, ACCOUNT_OWNER_KEY, id)
}

/**
 * Writes the owner only when none is recorded (legacy devices with a persisted session).
 * A persisted token of this account is taken as proof, so the data is not marked unconfirmed.
 */
export function backfillAccountOwner(accountId: string | null | undefined, storage: KeyStorage | null = defaultStorage()): void {
    if (!storage || readAccountOwner(storage) !== null) return
    writeAccountOwner(accountId, storage)
}

/** Identity of the stored in-progress workout (routine + final id). Null when there is none. */
function workoutFingerprint(storage: KeyStorage): string | null {
    const routine = safeGet(storage, ACTIVE_ROUTINE_KEY)
    if (!routine) return null
    const raw = `${routine}|${safeGet(storage, ROUTINE_FINAL_ID_KEY) ?? ""}`
    let hash = 5381
    for (let i = 0; i < raw.length; i++) hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0
    return `${raw.length}:${(hash >>> 0).toString(36)}`
}

/** Marks the current in-progress workout as adopted by `accountId` without proof that it is theirs. */
function markWorkoutUnconfirmed(accountId: string, storage: KeyStorage) {
    const fingerprint = workoutFingerprint(storage)
    if (!fingerprint) return
    safeSet(storage, UNCONFIRMED_WORKOUT_KEY, JSON.stringify({ accountId, fingerprint }))
}

export type WorkoutOwnership = "own" | "unconfirmed" | "other"

/**
 * Whether the stored in-progress workout belongs to `accountId`.
 * - "other": another account owns the device data (or no account is given).
 * - "unconfirmed": no owner is recorded, or a login adopted legacy data without proof. The resume card
 *   asks "내 기록이 맞나요?" before offering it. The mark is tied to that workout, so a new one is "own".
 */
export function workoutOwnershipFor(accountId: string | null | undefined, storage: KeyStorage | null = defaultStorage()): WorkoutOwnership {
    const id = normalizeAccountId(accountId)
    if (!id || !storage) return "other"
    const owner = readAccountOwner(storage)
    if (owner === null) return "unconfirmed"
    if (owner !== id) return "other"
    const flag = parseRecord(safeGet(storage, UNCONFIRMED_WORKOUT_KEY))
    if (flag && flag.accountId === id && flag.fingerprint === workoutFingerprint(storage)) return "unconfirmed"
    return "own"
}

/** The user confirmed the in-progress workout is theirs. */
export function confirmWorkoutOwnership(accountId: string | null | undefined, storage: KeyStorage | null = defaultStorage()): void {
    const id = normalizeAccountId(accountId)
    if (!id || !storage) return
    if (readAccountOwner(storage) === null) writeAccountOwner(id, storage)
    safeRemove(storage, UNCONFIRMED_WORKOUT_KEY)
}

/** True when the stored workout data may be offered to `accountId` (possibly after confirmation). */
export function isOwnedByAccount(accountId: string | null | undefined, storage: KeyStorage | null = defaultStorage()): boolean {
    return workoutOwnershipFor(accountId, storage) !== "other"
}

/** Removes the in-progress workout and the failed-save backup. */
export function clearAccountWorkoutData(
    storage: KeyStorage | null = defaultStorage(),
    options: { keepDemoSeeded?: boolean } = {},
): void {
    if (!storage) return
    for (const key of IN_PROGRESS_WORKOUT_KEYS) {
        if (options.keepDemoSeeded && DEMO_SEEDED_KEYS.has(key)) continue
        safeRemove(storage, key)
    }
    safeRemove(storage, FAILED_SAVE_KEY)
    safeRemove(storage, UNCONFIRMED_WORKOUT_KEY)
}

/** Keys a demo login moves aside: the whole in-progress workout, the backup and its unconfirmed mark. */
const SET_ASIDE_KEYS: readonly string[] = [...IN_PROGRESS_WORKOUT_KEYS, FAILED_SAVE_KEY, UNCONFIRMED_WORKOUT_KEY]

/**
 * Called right before a demo login seeds its data (seedDemoSession writes the same keys).
 * Moves the real account's workout data into DEMO_SET_ASIDE_KEY so the demo neither sees nor deletes it.
 * Skipped when the data already belongs to the demo. Never overwrites an existing set-aside, so
 * demo → logout → demo again keeps the real account's copy.
 */
export function setAsideAccountDataForDemo(storage: KeyStorage | null = defaultStorage()): void {
    if (!storage) return
    if (safeGet(storage, DEMO_MODE_KEY) === "true") return
    setAside(storage, SET_ASIDE_KEYS)
}

/**
 * Moves `keys` of the current real owner into the set-aside. Merges into an existing set-aside of the
 * same owner without overwriting what it already holds; never replaces another owner's set-aside.
 */
function setAside(storage: KeyStorage, keys: readonly string[]): void {
    if (safeGet(storage, DEMO_OWNER_FLAG_KEY) === "true") return
    const owner = readAccountOwner(storage)
    const existingRaw = safeGet(storage, DEMO_SET_ASIDE_KEY)
    let items: Record<string, string> = {}
    if (existingRaw !== null) {
        const existing = parseRecord(existingRaw)
        const existingOwner = existing && typeof existing.owner === "string" ? normalizeAccountId(existing.owner) : null
        if (!existing || existingOwner !== owner) return
        if (typeof existing.items === "object" && existing.items !== null) items = { ...(existing.items as Record<string, string>) }
    }
    const moved: string[] = []
    for (const key of keys) {
        const value = safeGet(storage, key)
        if (value === null) continue
        if (!(key in items)) items[key] = value
        moved.push(key)
    }
    if (moved.length === 0) return
    safeSet(storage, DEMO_SET_ASIDE_KEY, JSON.stringify({ owner, items }))
    for (const key of moved) safeRemove(storage, key)
}

/**
 * On a real-account login: gives the set-aside data back to its owner. Data with no recorded owner is
 * restored as unconfirmed. Data of a different real account is dropped, as on any account switch.
 */
function restoreSetAside(id: string, storage: KeyStorage): void {
    const raw = safeGet(storage, DEMO_SET_ASIDE_KEY)
    if (raw === null) return
    safeRemove(storage, DEMO_SET_ASIDE_KEY)
    const data = parseRecord(raw)
    if (!data) return
    const owner = typeof data.owner === "string" ? normalizeAccountId(data.owner) : null
    if (owner !== null && owner !== id) return
    const items = data.items
    if (typeof items !== "object" || items === null) return
    for (const key of SET_ASIDE_KEYS) {
        const value = (items as Record<string, unknown>)[key]
        if (typeof value === "string") safeSet(storage, key, value)
    }
    if (owner === null) markWorkoutUnconfirmed(id, storage)
}

export type AccountClaimResult = "same" | "adopted" | "switched"

/**
 * Called on login. Keeps the data when the same account logs in, adopts data with no owner (marked
 * unconfirmed), clears it when a different account logs in, then records the new owner.
 * `isDemo`: the demo login seeds its routine before the token is set, so those keys are kept. The real
 * account's data was set aside before seeding (setAsideAccountDataForDemo); anything left is set aside
 * here, never deleted. A later real login restores the set-aside for its owner.
 */
export function claimAccountData(
    accountId: string | null | undefined,
    options: { isDemo?: boolean } = {},
    storage: KeyStorage | null = defaultStorage(),
): AccountClaimResult {
    const id = normalizeAccountId(accountId)
    if (!id || !storage) return "same"
    const isDemo = options.isDemo === true
    const owner = readAccountOwner(storage)
    let result: AccountClaimResult
    if (owner === id) {
        result = "same"
    } else {
        // The demo seed already overwrote its own keys; set aside the rest instead of deleting them.
        if (isDemo) setAside(storage, SET_ASIDE_KEYS.filter((key) => !DEMO_SEEDED_KEYS.has(key)))
        writeAccountOwner(id, storage)
        if (owner === null) {
            if (!isDemo) markWorkoutUnconfirmed(id, storage)
            result = "adopted"
        } else {
            clearAccountWorkoutData(storage, { keepDemoSeeded: isDemo })
            result = "switched"
        }
    }
    if (isDemo) {
        safeSet(storage, DEMO_OWNER_FLAG_KEY, "true")
    } else {
        safeRemove(storage, DEMO_OWNER_FLAG_KEY)
        restoreSetAside(id, storage)
    }
    return result
}

/** Withdrawal: removes the account's workout data and forgets the owner. */
export function forgetAccountData(storage: KeyStorage | null = defaultStorage()): void {
    if (!storage) return
    clearAccountWorkoutData(storage)
    safeRemove(storage, ACCOUNT_OWNER_KEY)
    safeRemove(storage, DEMO_OWNER_FLAG_KEY)
}

export interface FailedSaveOffer {
    entry: FailedWorkoutSave
    /** The backup has no embedded owner (legacy): ask "내 기록이 맞나요?" before saving it. */
    needsConfirm: boolean
}

/** Owner embedded in the stored backup, or null for a legacy backup. */
function embeddedOwnerOf(raw: string | null): string | null {
    const data = parseRecord(raw)
    return data && typeof data.ownerSub === "string" ? normalizeAccountId(data.ownerSub) : null
}

/**
 * The failed-save backup as it may be offered to `accountId`:
 * - embedded owner is this account → offered;
 * - embedded owner is another account, or the device belongs to another account → null;
 * - no embedded owner (legacy) → offered only after confirmation.
 */
export function readFailedSaveOffer(
    accountId: string | null | undefined,
    storage: KeyStorage | null = defaultStorage(),
): FailedSaveOffer | null {
    const id = normalizeAccountId(accountId)
    if (!id || !storage) return null
    const raw = safeGet(storage, FAILED_SAVE_KEY)
    const entry = parseFailedSave(raw)
    if (!entry) return null
    const embedded = embeddedOwnerOf(raw)
    if (embedded !== null) return embedded === id ? { entry, needsConfirm: false } : null
    const deviceOwner = readAccountOwner(storage)
    if (deviceOwner !== null && deviceOwner !== id) return null
    return { entry, needsConfirm: true }
}

/** The failed-save backup when it may be offered to `accountId` (own, or legacy pending confirmation). */
export function readFailedSaveFor(
    accountId: string | null | undefined,
    storage: KeyStorage | null = defaultStorage(),
): FailedWorkoutSave | null {
    return readFailedSaveOffer(accountId, storage)?.entry ?? null
}

/** Writes the failed-save backup with its owner (`ownerSub` = JWT `sub` of the account that did the workout). */
export function writeOwnedFailedSave(
    entry: FailedWorkoutSave,
    ownerId: string | null | undefined,
    storage: KeyStorage | null = defaultStorage(),
): void {
    if (!storage) return
    safeSet(storage, FAILED_SAVE_KEY, JSON.stringify({ ...entry, ownerSub: normalizeAccountId(ownerId) }))
}

/** The user confirmed a legacy backup is theirs: stamps their owner into it so it is not asked again. */
export function confirmFailedSaveOwnership(accountId: string | null | undefined, storage: KeyStorage | null = defaultStorage()): void {
    const id = normalizeAccountId(accountId)
    if (!id || !storage) return
    const raw = safeGet(storage, FAILED_SAVE_KEY)
    const entry = parseFailedSave(raw)
    if (!entry || embeddedOwnerOf(raw) !== null) return
    writeOwnedFailedSave(entry, id, storage)
}
