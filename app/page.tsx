import Link from "next/link"
import { Apple, Dumbbell, Pill } from "lucide-react"
import DietSummaryCard from "@/app/components/DietSummaryCard"

export default function HomePage() {
    return (
        <div className="flex-1 flex flex-col pb-20">
            <div className="bg-white px-6 pt-4 pb-6 rounded-b-3xl shadow-sm border-b border-slate-100">
                <h1 className="text-2xl font-extrabold text-slate-800">오늘도 화이팅하세요!</h1>
            </div>

            <main className="px-5 mt-8 flex flex-col gap-8">
                <section>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 px-1">오늘 운동</h2>
                    <Link
                        href="/workout"
                        className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-blue-300 hover:shadow-md transition-all"
                    >
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-50 transition-colors">
                                <Dumbbell className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-500 mb-0.5">Workout Hub</p>
                                <h3 className="text-base font-extrabold text-slate-800">운동 기록과 목표 확인</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    오늘 운동 상태와 주간 진행률을 확인하세요.
                                </p>
                            </div>
                        </div>
                        <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </div>
                    </Link>
                </section>

                <DietSummaryCard showDetails={false} />

                <section>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 px-1">AI 코치 도구</h2>
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/ai_routine"
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl shrink-0">
                                <Dumbbell className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-slate-800">AI 운동 루틴 만들기</p>
                                <p className="text-xs text-slate-500 mt-0.5">컨디션에 맞는 운동 계획</p>
                            </div>
                            <div className="text-slate-300">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                        </Link>

                        <Link
                            href="/ai_quicklog"
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-xl shrink-0">
                                <Apple className="h-6 w-6 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-slate-800">AI로 식단 기록</p>
                                <p className="text-xs text-slate-500 mt-0.5">자연어로 빠르게 식단 기록</p>
                            </div>
                            <div className="text-slate-300">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                        </Link>

                        <Link
                            href="/ai_supplement"
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-xl shrink-0">
                                <Pill className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-slate-800">영양제 코치</p>
                                <p className="text-xs text-slate-500 mt-0.5">안전한 복용 가이드 확인</p>
                            </div>
                            <div className="text-slate-300">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    )
}
