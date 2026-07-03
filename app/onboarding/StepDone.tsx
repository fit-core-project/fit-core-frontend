"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Apple, Dumbbell, Home, PenLine } from "lucide-react"
import { toast } from "sonner"
import routineApiClient from "@/lib/api/routine/routineApiClient"

export default function StepDone() {
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)

    const handleManualRoutine = async () => {
        if (isCreating) return
        setIsCreating(true)
        try {
            const draft = await routineApiClient.createManualDraft("새 루틴")
            localStorage.setItem("fitcore_active_routine", JSON.stringify(draft))
            router.push("/routine/draft?mode=manual")
        } catch {
            toast.error("루틴 생성에 실패했습니다.")
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">설정 완료!</h2>
                <p className="mt-2 text-sm text-slate-500">이제 FIT-CORE를 시작할 준비가 됐어요.</p>
            </div>

            <div className="flex flex-col gap-3 mt-2">
                <button
                    type="button"
                    onClick={() => router.push("/ai_routine")}
                    className="flex items-center gap-3 w-full rounded-2xl bg-blue-600 px-5 py-4 text-left text-white transition-colors hover:bg-blue-700"
                >
                    <Dumbbell className="h-6 w-6 shrink-0" />
                    <div>
                        <p className="text-sm font-bold">AI 루틴 만들기</p>
                        <p className="text-xs text-blue-200 mt-0.5">내 설정에 맞는 루틴을 AI가 생성해요</p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={handleManualRoutine}
                    disabled={isCreating}
                    className="flex items-center gap-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                    <PenLine className="h-6 w-6 shrink-0 text-slate-600" />
                    <div>
                        <p className="text-sm font-bold text-slate-800">{isCreating ? "만드는 중..." : "직접 루틴 만들기"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">빈 루틴에서 직접 구성해요</p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => router.push("/nutrition")}
                    className="flex items-center gap-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                    <Apple className="h-6 w-6 shrink-0 text-emerald-600" />
                    <div>
                        <p className="text-sm font-bold text-slate-800">식단 기록하기</p>
                        <p className="text-xs text-slate-400 mt-0.5">오늘 먹은 것을 기록해요</p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="flex items-center gap-3 w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
                >
                    <Home className="h-6 w-6 shrink-0 text-slate-500" />
                    <div>
                        <p className="text-sm font-bold text-slate-700">홈으로</p>
                        <p className="text-xs text-slate-400 mt-0.5">나중에 둘러볼게요</p>
                    </div>
                </button>
            </div>

            <p className="text-center text-xs text-slate-400">
                체성분을 기록하면 변화 추이를 볼 수 있어요.{" "}
                <Link
                    href="/my?tab=stats"
                    className="font-medium text-slate-600 underline underline-offset-2"
                >
                    첫 체성분 기록하기 →
                </Link>
            </p>
        </div>
    )
}
