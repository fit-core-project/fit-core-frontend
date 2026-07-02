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

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <div className="px-6 pt-14 pb-4">
                <p className="text-xs font-semibold text-emerald-600 mb-1">FIT-CORE 시작하기</p>
                {step !== "done" && (
                    <>
                        <div className="flex gap-1.5 mt-3">
                            {STEPS.map((s, i) => (
                                <div
                                    key={s}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                        i <= stepIndex ? "bg-emerald-500" : "bg-slate-200"
                                    }`}
                                />
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                            {stepIndex + 1} / {STEPS.length}
                        </p>
                    </>
                )}
            </div>

            <main className="flex-1 px-6 pb-10">
                {step === "profile" && <StepProfile onNext={() => setStep("workout")} />}
                {step === "workout" && <StepWorkout onNext={() => setStep("nutrition")} />}
                {step === "nutrition" && <StepNutrition onNext={goToDone} />}
                {step === "done" && <StepDone />}
            </main>
        </div>
    )
}
