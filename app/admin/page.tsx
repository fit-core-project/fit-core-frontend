"use client"

import Link from "next/link"
import { ChevronRight, Dumbbell } from "lucide-react"
import { useAuthStore } from "@/store/authStore"

export default function AdminPage() {
    const user = useAuthStore((state) => state.user)

    return (
        <div className="flex flex-1 flex-col bg-ground px-4 pb-10 pt-6">
            <h1 className="text-headline font-bold text-ink">관리자 대시보드</h1>
            <p className="mt-1 text-body-sm text-ink-2">로그인 계정 {user?.email}</p>
            <div className="mt-6 grid gap-3">
                <Link
                    href="/admin/exercises"
                    className="flex min-h-16 w-full items-center gap-3 rounded-panel border border-hairline bg-ground px-4 py-3 hover:bg-surface active:bg-hairline"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-ink-2">
                        <Dumbbell className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-body font-bold text-ink">운동 데이터 관리</span>
                        <span className="block text-body-sm text-ink-2">exercise_tier 운동 목록 추가·수정·삭제</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                </Link>
            </div>
        </div>
    )
}
