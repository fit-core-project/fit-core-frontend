import Link from "next/link"

export default function HomePage() {
    return (
        <div className="flex-1 flex flex-col pb-20">
            {/* 1. 상단 인사말 및 AI 코치 인사이트 */}
            <div className="bg-white px-6 pt-4 pb-8 rounded-b-3xl shadow-sm border-b border-slate-100">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-6">오늘도 화이팅하세요! 🔥</h1>

                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-3 items-start">
                    <div className="bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-lg leading-none">🤖</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-1">
                            AI Coach Insight
                        </p>
                        <p className="text-sm text-slate-700 leading-snug break-keep">
                            어제 수면이 평균보다 부족했습니다. 오늘 예정된 <span className="font-bold">하체 루틴</span>
                            은 볼륨을 조금 줄이고 부상에 주의하세요.
                        </p>
                    </div>
                </div>
            </div>

            <main className="px-5 mt-8 flex flex-col gap-8">
                {/* 2. 데일리 영양 상태 (매크로) */}
                <section>
                    <div className="flex justify-between items-end mb-3 px-1">
                        <h2 className="text-lg font-bold text-slate-800">오늘의 영양</h2>
                        <span className="text-xs font-semibold text-slate-400">1,850 / 2,500 kcal</span>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        {/* 칼로리 프로그레스 바 */}
                        <div className="w-full h-3 bg-slate-100 rounded-full mb-6 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "74%" }}
                            ></div>
                        </div>

                        {/* 탄/단/지 요약 */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-400 mb-1">탄수화물</span>
                                <span className="text-sm font-extrabold text-slate-700">
                                    180<span className="text-[10px] text-slate-400 ml-0.5">g</span>
                                </span>
                            </div>
                            <div className="flex flex-col items-center border-l border-r border-slate-100">
                                <span className="text-xs font-bold text-emerald-500 mb-1">단백질</span>
                                <span className="text-sm font-extrabold text-slate-700">
                                    120<span className="text-[10px] text-slate-400 ml-0.5">/150g</span>
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-400 mb-1">지방</span>
                                <span className="text-sm font-extrabold text-slate-700">
                                    45<span className="text-[10px] text-slate-400 ml-0.5">g</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. 오늘의 운동 일정 */}
                <section>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 px-1">예정된 훈련</h2>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-emerald-50 transition-colors">
                                🏋️‍♂️
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-500 mb-0.5">Day 3</p>
                                <h3 className="text-base font-extrabold text-slate-800">스트랭스 하체 루틴</h3>
                                <p className="text-xs text-slate-400 mt-1">스쿼트 외 4개 종목 • 약 60분</p>
                            </div>
                        </div>
                        <div className="text-slate-300 group-hover:text-emerald-500 transition-colors">
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
                    </div>
                </section>

                {/* 4. AI 기능 바로가기 퀵 메뉴 */}
                <section>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 px-1">AI 코치 도구</h2>
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/ai_routine"
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl shrink-0">
                                📝
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-slate-800">루틴 생성</p>
                                <p className="text-xs text-slate-500 mt-0.5">컨디션 맞춤형 운동 계획</p>
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
                                🎙️
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-slate-800">퀵 로깅</p>
                                <p className="text-xs text-slate-500 mt-0.5">자연어로 식단 및 운동 기록</p>
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
                                💊
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
