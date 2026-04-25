"use client"

import React, { useState } from "react"
import { Plus } from "lucide-react"
import StatCard from "@/app/my/body-composition/StatCard"
import BodyCompositionChart from "@/app/my/body-composition/BodyCompositionChart"
import { BodyCompositionEditPage } from "@/app/my/body-composition/BodyCompositionEditPage"
import { BodyComposition, UserResponse } from "@/types/project"

const WeightIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
    >
        <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <path d="M12 6a4 4 0 0 0-4 4" />
        <circle cx="12" cy="12" r="3" />
        <path d="M15 15l1 1m-7-7l1 1" />
    </svg>
)

const MuscleIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
    >
        <path d="M6 18h12" />
        <path d="M18 18a6 6 0 0 0-12 0" />
        <path d="M12 6v12" />
        <path d="M8 6h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
        <path d="M8 10h8" />
    </svg>
)

const FatIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
    >
        <path d="M4 12c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6-6-2.7-6-6z" />
        <path d="M10 6c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
        <path d="M10 18c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2z" />
        <path d="M4 12h2m12 0h2m-10-6v2m0 10v2" />
    </svg>
)

interface props {
    profile: UserResponse | null
    onSave: (formData: BodyComposition) => Promise<boolean>
}

export default function BodyCompositionPage({ profile, onSave }: props) {
    const [isEditing, setIsEditing] = useState(false)
    const snapshots = profile?.bodyCompositionSnapshot || []
    const latest = snapshots[0] // 최신 데이터
    const previous = snapshots[1] // 이전 데이터

    interface StatDiff {
        text: string
        value?: string
        type: "up" | "down" | "none"
    }

    const calculateDiff = (current: number | undefined, prev: number | undefined, unit: string): StatDiff => {
        if (current === undefined || prev === undefined) {
            return { text: "첫 측정 기록", type: "none" }
        }

        const diff = current - prev
        const absDiff = Math.abs(diff).toFixed(1)

        if (diff === 0) return { text: "변동 없음", type: "none" }

        return {
            text: diff > 0 ? "증가" : "감소",
            value: `${diff > 0 ? "+" : ""}${absDiff}${unit}`,
            type: diff > 0 ? "up" : "down",
        }
    }

    const latestData = {
        weight: {
            value: latest?.bodyWeightKg?.toFixed(1) || "-",
            unit: "kg",
            diff: calculateDiff(latest?.bodyWeightKg, previous?.bodyWeightKg, "kg"),
        },
        muscle: {
            value: latest?.skeletalMuscleMassKg?.toFixed(1) || "-",
            unit: "kg",
            diff: calculateDiff(latest?.skeletalMuscleMassKg, previous?.skeletalMuscleMassKg, "kg"),
        },
        fat: {
            value: latest?.bodyFatPct?.toFixed(1) || "-",
            unit: "%",
            diff: calculateDiff(latest?.bodyFatPct, previous?.bodyFatPct, "%"),
        },
    }

    const saveTrack = async (formData: BodyComposition) => {
        if (await onSave(formData)) {
            setIsEditing(false)
        }
    }

    return (
        <>
            {isEditing ? (
                <BodyCompositionEditPage onCancel={() => setIsEditing(false)} onSave={saveTrack} />
            ) : (
                <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
                    <h1 className="text-xl font-bold mb-6">체성분 변화</h1>

                    {/* 최신 측정 상태 섹션 */}
                    <section className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-500 mb-4">
                            최신 측정 상태 (Latest Body Composition)
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <StatCard
                                label="체중"
                                value={latestData.weight.value}
                                unit={latestData.weight.unit}
                                color="text-blue-600"
                                icon={<WeightIcon />}
                                diff={latestData.weight.diff}
                            />
                            <StatCard
                                label="골격근량"
                                value={latestData.muscle.value}
                                unit={latestData.muscle.unit}
                                color="text-blue-600"
                                icon={<MuscleIcon />}
                                diff={latestData.muscle.diff}
                            />
                            <StatCard
                                label="체지방률"
                                value={latestData.fat.value}
                                unit={latestData.fat.unit}
                                color="text-blue-600"
                                icon={<FatIcon />}
                                diff={latestData.fat.diff}
                            />
                        </div>
                    </section>

                    {/* 변화 추이 그래프 섹션 */}
                    <section className="bg-white p-4 rounded-2xl shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-500 mb-4">변화 추이</h2>
                        <BodyCompositionChart data={profile?.bodyCompositionSnapshot || []} />
                    </section>

                    <button
                        onClick={() => setIsEditing(true)}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            )}
        </>
    )
}
