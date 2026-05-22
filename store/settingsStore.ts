import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface SettingsState {
    weightUnit: "kg" | "lbs"
    setWeightUnit: (unit: "kg" | "lbs") => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            weightUnit: "kg",
            setWeightUnit: (unit) => set({ weightUnit: unit }),
        }),
        {
            name: "fitcore-settings",
            storage: createJSONStorage(() => localStorage),
        }
    )
)
