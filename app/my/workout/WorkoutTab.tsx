"use client"

import { useState } from "react"
import Routine from "@/app/my/routine/Routine"
import WorkoutList from "@/app/my/workout/WorkoutList"
import WorkoutSettingsSection from "@/app/my/workout/WorkoutSettingsSection"

type SubTabId = "routine" | "history"

const subTabs: { id: SubTabId; label: string }[] = [
    { id: "routine", label: "루틴" },
    { id: "history", label: "이력" },
]

export default function WorkoutTab() {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>("routine")

    return (
        <div>
            <WorkoutSettingsSection />
            <div className="mb-4 flex border-b border-gray-200">
                {subTabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`mr-4 border-b-2 pb-2 text-sm font-medium transition-colors ${
                            activeSubTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeSubTab === "routine" && <Routine />}
            {activeSubTab === "history" && <WorkoutList />}
        </div>
    )
}
