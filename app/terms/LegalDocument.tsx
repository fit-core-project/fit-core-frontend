import Link from "next/link"
import type { ReactNode } from "react"

export const LEGAL_EFFECTIVE_DATE = "2026년 11월 16일"

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <h2 className="text-title-sm font-bold text-ink">{title}</h2>
            <div className="flex flex-col gap-2 text-body-sm leading-relaxed text-ink-2 [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                {children}
            </div>
        </section>
    )
}

/** Shared frame for /terms and /privacy: one column, readable body text, links back into the app. */
export function LegalDocument({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
    return (
        <article className="mx-auto flex w-full max-w-[480px] flex-col gap-8 bg-ground px-4 pb-24 pt-6">
            <header className="flex flex-col gap-2">
                <h1 className="text-headline font-bold text-ink">{title}</h1>
                <p className="text-body text-ink-2">{summary}</p>
                <p className="text-caption text-ink-2">시행일: {LEGAL_EFFECTIVE_DATE}</p>
            </header>

            {children}

            <footer className="flex flex-col gap-1 border-t border-hairline pt-6 text-body-sm">
                <Link href="/my?tab=settings" className="inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-2">
                    설정으로 가기 (문의하기)
                </Link>
                <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-2">
                    로그인 화면으로 가기
                </Link>
            </footer>
        </article>
    )
}
