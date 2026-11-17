"use client"

import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui"

export default function RouteError({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string }
    unstable_retry: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-ground px-4 py-12 text-center">
            <TriangleAlert className="size-7 text-danger" aria-hidden />
            <h1 className="text-title font-bold text-ink">화면을 불러오지 못했어요</h1>
            <p className="max-w-[30ch] text-body text-ink-2">잠시 후 다시 시도해 주세요. 계속되면 홈으로 돌아가 주세요.</p>
            {error.digest && <p className="text-caption text-ink-2">오류 코드 {error.digest}</p>}
            <div className="mt-4 flex w-full max-w-[320px] flex-col gap-2">
                <Button variant="primary" size="lg" block onClick={() => unstable_retry()}>
                    다시 시도
                </Button>
                <ButtonLink href="/" variant="ghost" size="lg" block>
                    홈으로
                </ButtonLink>
            </div>
        </div>
    )
}
