/**
 * Rest-end cue: short vibration and beep. Browsers (iOS Safari in particular) only play Web Audio
 * from a context created or resumed during a user gesture, so call primeRestCue() from the tap that
 * starts the rest, then playRestCue() when it ends. Everything is a silent no-op when unsupported.
 */

type AudioContextCtor = typeof AudioContext

let audioContext: AudioContext | null = null

function audioCtor(): AudioContextCtor | null {
    if (typeof window === "undefined") return null
    const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
    return w.AudioContext ?? w.webkitAudioContext ?? null
}

export function primeRestCue(): void {
    try {
        const Ctor = audioCtor()
        if (!Ctor) return
        if (!audioContext) audioContext = new Ctor()
        if (audioContext.state === "suspended") void audioContext.resume().catch(() => {})
    } catch {
        audioContext = null
    }
}

function beep(): void {
    const ctx = audioContext
    if (!ctx || ctx.state === "closed") return
    try {
        const start = ctx.currentTime
        // Two short tones, loud enough to hear in a gym without being harsh.
        ;[0, 0.22].forEach((offset) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = "sine"
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.0001, start + offset)
            gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16)
            osc.connect(gain).connect(ctx.destination)
            osc.start(start + offset)
            osc.stop(start + offset + 0.18)
        })
    } catch {
        /* ignore */
    }
}

export function playRestCue(options: { muted: boolean }): void {
    try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([200, 100, 200])
    } catch {
        /* ignore */
    }
    if (!options.muted) beep()
}
