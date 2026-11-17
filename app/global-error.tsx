"use client"

import { useEffect } from "react"
import "./globals.css"
import { Button } from "@/components/ui"

export default function GlobalError({
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
        <html lang="ko" className="h-[100dvh]">
            <body className="h-[100dvh] bg-surface antialiased">
                <title>오류 | Fit Core</title>
                <main className="mx-auto flex h-full w-full max-w-[480px] flex-col items-center justify-center gap-3 bg-ground px-4 text-center">
                    <h1 className="text-title font-bold text-ink">앱을 불러오지 못했어요</h1>
                    <p className="max-w-[30ch] text-body text-ink-2">잠시 후 다시 시도해 주세요.</p>
                    {error.digest && <p className="text-caption text-ink-2">오류 코드 {error.digest}</p>}
                    <div className="mt-4 flex w-full max-w-[320px] flex-col gap-2">
                        <Button variant="primary" size="lg" block onClick={() => unstable_retry()}>
                            다시 시도
                        </Button>
                        {/* Full reload: the safest recovery when the root layout itself failed. */}
                        <Button variant="ghost" size="lg" block onClick={() => window.location.assign("/")}>
                            홈으로
                        </Button>
                    </div>
                </main>
            </body>
        </html>
    )
}
