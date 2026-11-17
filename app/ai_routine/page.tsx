"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock, RefreshCw } from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel"
import { getUserCondition } from "@/services/userDataService"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import type { UserResponse } from "@/types/project"
import { muscleLabel } from "@/utils/displayLabels"
import { Button, Notice, Section, Sheet } from "@/components/ui"
import { mergeLoadedDoms } from "./conditionDoms"

const LOCKED_PAIN_MESSAGE = "통증 부위는 마이 > 운동 설정에서 바꿀 수 있어요"

export default function RoutineHome() {
    const router = useRouter()
    const [domsData, setDomsData] = useState<Record<string, number>>({})
    const [painAreas, setPainAreas] = useState<string[]>([])
    const [toastMessage, setToastMessage] = useState("")
    const [profile, setProfile] = useState<UserResponse | null>(null)
    const [profileLoading, setProfileLoading] = useState(true)
    // Pain areas protect the user, so a failed load must never silently become an empty list.
    const [conditionStatus, setConditionStatus] = useState<"loading" | "ready" | "failed">("loading")
    const [skipPainConfirmOpen, setSkipPainConfirmOpen] = useState(false)
    /** Muscles the user tapped here; their value (even "cleared") wins over a later condition load. */
    const touchedMusclesRef = useRef<Set<string>>(new Set())

    const fetchCondition = useCallback(() => {
        getUserCondition()
            .then((condition) => {
                // Keep taps the user already made (including cleared ones); saved soreness only fills untouched parts.
                setDomsData((prev) => mergeLoadedDoms(condition.doms as Record<string, number>, prev, touchedMusclesRef.current))
                setPainAreas([...condition.painAreas])
                setConditionStatus("ready")
            })
            .catch((err) => {
                console.error("[condition] failed to load profile condition:", err)
                setConditionStatus("failed")
            })
    }, [])

    useEffect(() => {
        fetchCondition()
    }, [fetchCondition])

    const loadCondition = () => {
        setConditionStatus("loading")
        fetchCondition()
    }

    useEffect(() => {
        profileApiClient
            .getMe()
            .then(setProfile)
            .catch(() => {})
            .finally(() => setProfileLoading(false))
    }, [])

    const missingRoutineSettings = profileLoading
        ? []
        : ([
              !profile?.goalType && "운동 목표",
              !profile?.experienceLevel && "운동 경험 수준",
              (!profile?.equipmentAccess || profile.equipmentAccess.length === 0) && "사용 가능 장비",
          ].filter(Boolean) as string[])

    useEffect(() => {
        if (!toastMessage) return
        const timer = window.setTimeout(() => setToastMessage(""), 2000)
        return () => window.clearTimeout(timer)
    }, [toastMessage])

    const showLockedPainToast = () => {
        setToastMessage(LOCKED_PAIN_MESSAGE)
    }

    const handleMuscleClick = (muscleName: string) => {
        if (painAreas.includes(muscleName)) {
            showLockedPainToast()
            return
        }

        touchedMusclesRef.current.add(muscleName)
        setDomsData((prev) => {
            const current = prev[muscleName] || 0
            const next = (current + 1) % 3 // 0(정상) → 1(뻐근함) → 2(근육통) → 0
            const newData = { ...prev }
            if (next === 0) delete newData[muscleName]
            else newData[muscleName] = next
            return newData
        })
    }

    const goNext = () => {
        localStorage.setItem("fitcore_doms_data", JSON.stringify(domsData))
        localStorage.setItem("fitcore_pain_areas", JSON.stringify(painAreas))
        router.push("/ai_routine/generator")
    }

    const handleNext = () => {
        if (conditionStatus === "loading") return
        if (conditionStatus === "failed") {
            setSkipPainConfirmOpen(true)
            return
        }
        goNext()
    }

    const retryFromSheet = () => {
        setSkipPainConfirmOpen(false)
        loadCondition()
    }

    return (
        <div className="flex min-h-full w-full flex-col bg-ground">
            <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-hairline bg-ground px-2 py-1.5">
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    aria-label="홈으로"
                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                >
                    <ArrowLeft className="size-5" aria-hidden />
                </button>
                <h1 className="min-w-0 flex-1 truncate text-body font-bold text-ink">컨디션 체크</h1>
            </header>

            <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
                {toastMessage && (
                    <p className="max-w-[440px] rounded-control bg-ink px-4 py-3 text-body-sm font-medium text-white">
                        {toastMessage}
                    </p>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-6 px-4 py-5">
                <div className="flex flex-col gap-1">
                    <p className="text-title-sm font-bold text-ink">오늘 몸 상태를 알려 주세요</p>
                    <p className="text-body-sm text-ink-2">
                        부위를 누를 때마다 정상, 뻐근함, 근육통 순서로 바뀌어요. AI가 이 상태를 보고 운동량을 조절해요.
                    </p>
                </div>

                {conditionStatus === "failed" && (
                    <Notice tone="danger" title="프로필의 통증 부위를 불러오지 못했어요">
                        <p>이대로 만들면 통증 부위를 피하지 않은 루틴이 나올 수 있어요.</p>
                        <button
                            type="button"
                            onClick={loadCondition}
                            className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-bold underline underline-offset-2"
                        >
                            <RefreshCw className="size-4" aria-hidden />
                            다시 불러오기
                        </button>
                    </Notice>
                )}

                <AnatomyModel data={domsData} onMuscleClick={handleMuscleClick} mode="doms" lockedMuscles={painAreas} />

                {painAreas.length > 0 && (
                    <Section title="프로필의 통증 부위">
                        <p className="-mt-1 text-body-sm text-ink-2">
                            이 부위는 루틴에서 보호돼요. 바꾸려면 마이 &gt; 운동 설정으로 가세요.
                        </p>
                        <ul className="flex flex-wrap gap-2">
                            {painAreas.map((painArea) => (
                                <li key={painArea}>
                                    <button
                                        type="button"
                                        aria-disabled="true"
                                        onClick={showLockedPainToast}
                                        className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-danger bg-danger-bg px-3 text-body-sm font-medium text-danger-ink"
                                    >
                                        <Lock className="size-3.5" aria-hidden />
                                        {muscleLabel(painArea)}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {missingRoutineSettings.length > 0 && (
                    <Notice title="운동 설정을 채우면 루틴이 더 정확해져요">
                        <p className="mt-0.5 text-ink-2">비어 있는 항목: {missingRoutineSettings.join(", ")}</p>
                        <Link
                            href="/my?tab=workout"
                            className="mt-1 inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-2"
                        >
                            운동 설정하기
                        </Link>
                    </Notice>
                )}
            </div>

            <div className="sticky bottom-0 z-10 mt-auto border-t border-hairline bg-ground px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {conditionStatus === "loading" && (
                    <p role="status" className="mb-2 text-caption text-ink-2">
                        프로필의 통증 부위를 불러오는 중이에요.
                    </p>
                )}
                <Button variant="primary" size="lg" block onClick={handleNext} loading={conditionStatus === "loading"}>
                    루틴 세부 설정하기
                </Button>
            </div>

            <Sheet
                open={skipPainConfirmOpen}
                onClose={() => setSkipPainConfirmOpen(false)}
                title="통증 부위 없이 진행할까요?"
                description="프로필의 통증 부위를 불러오지 못했어요. 이대로 가면 AI가 통증 부위를 모른 채 루틴을 만들어요."
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" size="lg" onClick={retryFromSheet}>
                            다시 불러오기
                        </Button>
                        <Button variant="danger" size="lg" onClick={goNext}>
                            통증 부위 없이 진행
                        </Button>
                    </div>
                }
            >
                <p className="text-body-sm text-ink-2">통증이 있다면 운동 중 그 부위에 무리가 가지 않는지 직접 확인하세요.</p>
            </Sheet>
        </div>
    )
}
