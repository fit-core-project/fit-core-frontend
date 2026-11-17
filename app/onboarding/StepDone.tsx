"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Apple, ChevronRight, Home, PenLine, Sparkles } from "lucide-react"
import { toast } from "sonner"
import routineApiClient from "@/lib/api/routine/routineApiClient"
import { writeActiveRoutine } from "@/utils/activeWorkout"
import { Button } from "@/components/ui"

function NextRow({
    icon,
    title,
    body,
    onClick,
    disabled,
}: {
    icon: React.ReactNode
    title: string
    body: string
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-busy={disabled || undefined}
            className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface disabled:opacity-40"
        >
            <span className="shrink-0 text-ink-2 [&_svg]:size-5" aria-hidden>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-body font-bold text-ink">{title}</span>
                <span className="block text-body-sm text-ink-2">{body}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
        </button>
    )
}

export default function StepDone({ weightSaved = false }: { weightSaved?: boolean }) {
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)

    const handleManualRoutine = async () => {
        if (isCreating) return
        setIsCreating(true)
        try {
            const draft = await routineApiClient.createManualDraft("새 루틴")
            writeActiveRoutine(draft, { finalId: null })
            router.push("/routine/draft?mode=manual")
        } catch {
            toast.error("루틴을 만들지 못했어요. 잠시 후 다시 시도하세요.")
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-title font-bold text-ink">준비가 끝났어요</h1>
                <p className="mt-1 text-body-sm text-ink-2">오늘 할 일부터 골라 보세요.</p>
            </div>

            <div className="flex flex-col gap-3">
                <Button variant="primary" size="lg" block icon={<Sparkles className="size-5" aria-hidden />} onClick={() => router.push("/ai_routine")}>
                    AI 루틴 만들기
                </Button>
                <p className="-mt-1 text-center text-body-sm text-ink-2">방금 정한 설정에 맞춰 AI가 루틴을 짜요.</p>
            </div>

            <div className="divide-y divide-hairline overflow-hidden rounded-panel border border-hairline bg-ground">
                <NextRow
                    icon={<PenLine />}
                    title={isCreating ? "루틴을 만들고 있어요" : "직접 루틴 만들기"}
                    body="빈 루틴에서 운동을 직접 골라요."
                    onClick={handleManualRoutine}
                    disabled={isCreating}
                />
                <NextRow icon={<Apple />} title="식단 기록하기" body="오늘 먹은 것을 적어요." onClick={() => router.push("/nutrition")} />
                <NextRow icon={<Home />} title="홈으로 가기" body="나중에 둘러볼게요." onClick={() => router.push("/")} />
            </div>

            <p className="text-center text-body-sm text-ink-2">
                {weightSaved ? "오늘 체중을 기록했어요. 골격근량·체지방도 적으면 변화를 더 자세히 볼 수 있어요." : "체성분을 기록하면 변화 추이를 볼 수 있어요."}{" "}
                <Link href="/my?tab=stats" className="inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-2">
                    {weightSaved ? "체성분 더 기록하기" : "첫 체성분 기록하기"}
                </Link>
            </p>
        </div>
    )
}
