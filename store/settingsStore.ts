import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface SettingsState {
    weightUnit: "kg" | "lbs"
    setWeightUnit: (unit: "kg" | "lbs") => void
    /** Mutes the beep at the end of a rest (vibration stays). */
    restSoundMuted: boolean
    setRestSoundMuted: (muted: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            weightUnit: "kg",
            setWeightUnit: (unit) => set({ weightUnit: unit }),
            restSoundMuted: false,
            setRestSoundMuted: (muted) => set({ restSoundMuted: muted }),
        }),
        {
            name: "fitcore-settings",
            storage: createJSONStorage(() => localStorage),
        }
    )
)
