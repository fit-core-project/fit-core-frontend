type TrackLike = { stop: () => void }
type StreamLike = { getTracks: () => TrackLike[] }

interface RecorderLike {
    state: string
    stream?: StreamLike | null
    onstop: ((ev: Event) => unknown) | null
    ondataavailable: ((ev: BlobEvent) => unknown) | null
    stop: () => void
}

export function stopStreamTracks(stream: StreamLike | null | undefined): void {
    stream?.getTracks().forEach((track) => {
        try {
            track.stop()
        } catch {
            // already stopped
        }
    })
}

/**
 * Stops a recorder without firing its upload handler and turns the microphone off.
 * Used on unmount / "새 대화" so leaving mid-recording neither keeps the mic on nor sends audio.
 */
export function discardRecorder(recorder: RecorderLike | null | undefined): void {
    if (!recorder) return
    recorder.onstop = null
    recorder.ondataavailable = null
    if (recorder.state !== "inactive") {
        try {
            recorder.stop()
        } catch {
            // ignore: the recorder may already be stopping
        }
    }
    stopStreamTracks(recorder.stream)
}
