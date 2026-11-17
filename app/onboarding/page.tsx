"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { isOnboardingDone, markOnboardingDone } from "@/lib/api/profile/onboardingFlag"
import StepProfile from "./StepProfile"
import StepWorkout from "./StepWorkout"
import StepBody from "./StepBody"
import StepNutrition from "./StepNutrition"
import StepDone from "./StepDone"

type OnboardingStep = "profile" | "workout" | "body" | "nutrition" | "done"

const STEPS: OnboardingStep[] = ["profile", "workout", "body", "nutrition"]

export default function OnboardingPage() {
    const router = useRouter()
    const email = useAuthStore((state) => state.user?.email)
    const [step, setStep] = useState<OnboardingStep>("profile")
    // True once the 몸 상태 step recorded today's weight, so the done screen does not ask for a "first" record.
    const [weightSaved, setWeightSaved] = useState(false)
    const mainRef = useRef<HTMLElement>(null)
    const firstRender = useRef(true)

    useEffect(() => {
        if (step === "done") return
        if (isOnboardingDone(email)) {
            router.replace("/")
        }
    }, [router, step, email])

    // Move focus to the new step's heading so screen readers announce the change.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false
            return
        }
        window.scrollTo({ top: 0 })
        const heading = mainRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] h1`)
        if (heading) {
            heading.tabIndex = -1
            heading.focus()
        }
    }, [step])

    const goToDone = () => {
        markOnboardingDone(email)
        setStep("done")
    }

    const stepIndex = STEPS.indexOf(step as (typeof STEPS)[number])
    const progress = ((stepIndex + 1) / STEPS.length) * 100
    const previousStep = stepIndex > 0 ? STEPS[stepIndex - 1] : null

    return (
        <div className="flex min-h-screen flex-col bg-ground">
            <div className="px-4 pb-6 pt-6">
                <div className="flex min-h-11 items-center">
                    {previousStep ? (
                        <button
                            type="button"
                            onClick={() => setStep(previousStep)}
                            className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-body-sm font-medium text-ink-2 hover:bg-surface hover:text-ink"
                        >
                            <ChevronLeft className="size-5" aria-hidden />
                            이전 단계
                        </button>
                    ) : (
                        <p className="text-body-sm font-medium text-ink-2">시작 설정</p>
                    )}
                </div>
                {step !== "done" && (
                    <div className="mt-3 flex items-center gap-3">
                        <div
                            className="h-0.5 flex-1 bg-hairline"
                            role="progressbar"
                            aria-label="시작 설정 진행"
                            aria-valuemin={1}
                            aria-valuemax={STEPS.length}
                            aria-valuenow={stepIndex + 1}
                            aria-valuetext={`${STEPS.length}단계 중 ${stepIndex + 1}단계`}
                        >
                            <div className="h-full bg-ink transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-body-sm font-bold tabular-nums text-ink" aria-hidden>
                            {stepIndex + 1} / {STEPS.length}
                        </p>
                    </div>
                )}
            </div>

            <main ref={mainRef} className="flex-1 px-4 pb-10">
                {/* Steps stay mounted so going back keeps what the user already entered. */}
                <div data-step="profile" hidden={step !== "profile"}>
                    <StepProfile onNext={() => setStep("workout")} />
                </div>
                <div data-step="workout" hidden={step !== "workout"}>
                    <StepWorkout onNext={() => setStep("body")} />
                </div>
                <div data-step="body" hidden={step !== "body"}>
                    <StepBody
                        onNext={(result) => {
                            if (result.weightSaved) setWeightSaved(true)
                            setStep("nutrition")
                        }}
                    />
                </div>
                <div data-step="nutrition" hidden={step !== "nutrition"}>
                    <StepNutrition onNext={goToDone} />
                </div>
                {step === "done" && (
                    <div data-step="done">
                        <StepDone weightSaved={weightSaved} />
                    </div>
                )}
            </main>
        </div>
    )
}
