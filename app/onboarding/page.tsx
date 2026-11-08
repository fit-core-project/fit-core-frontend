"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import StepProfile from "./StepProfile"
import StepWorkout from "./StepWorkout"
import StepNutrition from "./StepNutrition"
import StepDone from "./StepDone"

type OnboardingStep = "profile" | "workout" | "nutrition" | "done"

const STEPS: OnboardingStep[] = ["profile", "workout", "nutrition"]

export default function OnboardingPage() {
    const router = useRouter()
    const [step, setStep] = useState<OnboardingStep>("profile")

    useEffect(() => {
        if (typeof window === "undefined") return
        if (step === "done") return
        if (window.localStorage.getItem("fitcore_onboarding_done") === "1") {
            router.replace("/")
        }
    }, [router, step])

    const goToDone = () => {
        if (typeof window !== "undefined") localStorage.setItem("fitcore_onboarding_done", "1")
        setStep("done")
    }

    const stepIndex = STEPS.indexOf(step as (typeof STEPS)[number])
    const progress = ((stepIndex + 1) / STEPS.length) * 100

    return (
        <div className="flex min-h-screen flex-col bg-ground">
            <div className="px-4 pb-6 pt-10">
                <p className="text-body-sm font-medium text-ink-2">시작 설정</p>
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

            <main className="flex-1 px-4 pb-10">
                {step === "profile" && <StepProfile onNext={() => setStep("workout")} />}
                {step === "workout" && <StepWorkout onNext={() => setStep("nutrition")} />}
                {step === "nutrition" && <StepNutrition onNext={goToDone} />}
                {step === "done" && <StepDone />}
            </main>
        </div>
    )
}
