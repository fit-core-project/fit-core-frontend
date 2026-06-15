"use client"

import { useRouter } from "next/navigation"
import { ChevronRight, Dumbbell } from "lucide-react"
import { useAuthStore } from "@/store/authStore"

export default function AdminPage() {
    const user = useAuthStore((state) => state.user)
    const router = useRouter()

    return (
        <div className="p-6">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">관리자 대시보드</h1>
            <p className="mb-6 text-sm text-slate-500">로그인: {user?.email}</p>
            <div className="grid gap-3">
                <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
                    onClick={() => router.push("/admin/exercises")}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                            <Dumbbell size={18} className="text-emerald-600" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-slate-800">운동 데이터 관리</p>
                            <p className="text-xs text-slate-400">exercise_tier 테이블 CRUD</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                </button>
            </div>
        </div>
    )
}
