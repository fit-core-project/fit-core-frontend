import { describe, expect, it, vi } from "vitest"
import { discardRecorder, stopStreamTracks } from "@/utils/mediaRecorderCleanup"

function fakeRecorder(state: string) {
    const track = { stop: vi.fn() }
    const onstop = vi.fn()
    const recorder: {
        state: string
        stream: { getTracks: () => { stop: () => void }[] }
        onstop: ((ev: Event) => unknown) | null
        ondataavailable: ((ev: BlobEvent) => unknown) | null
        stop: ReturnType<typeof vi.fn>
    } = {
        state,
        stream: { getTracks: () => [track] },
        onstop,
        ondataavailable: vi.fn(),
        // Real MediaRecorder fires onstop after stop(); the upload handler must not run.
        stop: vi.fn(() => {
            recorder.onstop?.({} as Event)
        }),
    }
    return { recorder, track, onstop }
}

describe("discardRecorder (P2-7)", () => {
    it("stops a live recorder and its tracks without running the upload handler", () => {
        const { recorder, track, onstop } = fakeRecorder("recording")
        discardRecorder(recorder)
        expect(recorder.stop).toHaveBeenCalledTimes(1)
        expect(onstop).not.toHaveBeenCalled()
        expect(track.stop).toHaveBeenCalledTimes(1)
        expect(recorder.ondataavailable).toBeNull()
    })
    it("does not call stop() on an inactive recorder but still releases tracks", () => {
        const { recorder, track } = fakeRecorder("inactive")
        discardRecorder(recorder)
        expect(recorder.stop).not.toHaveBeenCalled()
        expect(track.stop).toHaveBeenCalledTimes(1)
    })
    it("tolerates null", () => {
        expect(() => discardRecorder(null)).not.toThrow()
        expect(() => stopStreamTracks(undefined)).not.toThrow()
    })
})
