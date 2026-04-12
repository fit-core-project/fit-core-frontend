"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Activity, Clock, Target, Dumbbell, Send, AlertCircle } from "lucide-react"

type MuscleGroup =
    | "CHEST_UPPER"
    | "CHEST_MID_LOWER"
    | "BACK_LATS"
    | "BACK_TRAPS"
    | "BACK_LOWER"
    | "SHOULDER_FRONT"
    | "SHOULDER_LATERAL"
    | "SHOULDER_REAR"
    | "LEG_QUADS"
    | "LEG_HAMSTRINGS"
    | "LEG_GLUTES"
    | "LEG_CALVES"
    | "ARM_BICEPS"
    | "ARM_TRICEPS"
    | "ARM_FOREARMS"
    | "CORE_ABS"
    | "CORE_OBLIQUES"
type Equipment = "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT"
type TrainingGoal = "HYPERTROPHY" | "STRENGTH" | "ENDURANCE"

interface RoutineRequest {
    target_muscles: MuscleGroup[]
    equipment: Equipment[]
    time_available_min: number
    pain_areas: string[]
    doms_data: Record<string, number>
    goal: TrainingGoal
    user_note: string
}

const LOADING_MESSAGES = [
    "근육들이 긴급 회의를 소집했습니다...",
    "오늘은 어디를 괴롭힐지 계산 중입니다...",
    "내일의 근육통을 정성껏 설계하고 있습니다...",
    "벤치프레스가 당신을 애타게 기다립니다...",
    "하체가 도망가기 전에 퇴로를 차단하는 중...",
    "운동하기 싫은 마음을 강제 종료하는 중...",
    "숨쉬기 운동은 루틴에서 과감히 뺐습니다...",
    "AI 코치가 매의 눈으로 스탯을 분석 중입니다...",
    "단백질이 가장 달콤해질 타이밍을 재는 중...",
]

const MUSCLES: { label: string; value: MuscleGroup }[] = [
    { label: "상부 가슴", value: "CHEST_UPPER" },
    { label: "중/하부 가슴", value: "CHEST_MID_LOWER" },
    { label: "광배근", value: "BACK_LATS" },
    { label: "승모/능형근", value: "BACK_TRAPS" },
    { label: "척추기립근", value: "BACK_LOWER" },
    { label: "전면 삼각근", value: "SHOULDER_FRONT" },
    { label: "측면 삼각근", value: "SHOULDER_LATERAL" },
    { label: "후면 삼각근", value: "SHOULDER_REAR" },
    { label: "앞벅지", value: "LEG_QUADS" },
    { label: "뒷벅지", value: "LEG_HAMSTRINGS" },
    { label: "둔근", value: "LEG_GLUTES" },
    { label: "종아리", value: "LEG_CALVES" },
    { label: "이두근", value: "ARM_BICEPS" },
    { label: "삼두근", value: "ARM_TRICEPS" },
    { label: "전완근", value: "ARM_FOREARMS" },
    { label: "복직근", value: "CORE_ABS" },
    { label: "복사근", value: "CORE_OBLIQUES" },
]

const EQUIPMENTS: { label: string; value: Equipment }[] = [
    { label: "바벨", value: "BARBELL" },
    { label: "덤벨", value: "DUMBBELL" },
    { label: "머신", value: "MACHINE" },
    { label: "케이블", value: "CABLE" },
    { label: "맨몸", value: "BODYWEIGHT" },
]

export default function RoutineGenerator() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
    const [domsSummary, setDomsSummary] = useState<string>("")

    const [formData, setFormData] = useState<RoutineRequest>({
        target_muscles: [],
        equipment: ["BODYWEIGHT"],
        time_available_min: 60,
        pain_areas: [],
        doms_data: {},
        goal: "HYPERTROPHY",
        user_note: "",
    })

    useEffect(() => {
        const savedDoms = localStorage.getItem("fitcore_doms_data")
        if (savedDoms) {
            const parsedDoms = JSON.parse(savedDoms)
            const painfulAreas = Object.keys(parsedDoms).filter((key) => parsedDoms[key] === 3)

            setFormData((prev) => ({
                ...prev,
                doms_data: parsedDoms,
                pain_areas: painfulAreas,
            }))

            const partsCount = Object.keys(parsedDoms).length
            setDomsSummary(
                partsCount > 0 ? `현재 ${partsCount}개 부위에 피로도가 감지되었습니다.` : "최상의 컨디션입니다!"
            )
        }
    }, [])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
            }, 1800)
        } else {
            setLoadingMsgIndex(0)
        }
        return () => clearInterval(interval)
    }, [isLoading])

    const toggleArrayItem = (key: keyof RoutineRequest, value: string) => {
        setFormData((prev) => {
            const currentArray = prev[key] as string[]
            if (currentArray.includes(value)) {
                return { ...prev, [key]: currentArray.filter((item) => item !== value) }
            } else {
                return { ...prev, [key]: [...currentArray, value] }
            }
        })
    }

    const handleSubmit = async () => {
        setIsLoading(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/generate-routine`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error(`서버 에러: ${response.status}`)
            }

            const routineData = await response.json()

            localStorage.setItem("fitcore_active_routine", JSON.stringify(routineData))
            router.push("/ai_routine/player")
        } catch (error) {
            console.error("❌ 통신 에러:", error)
            alert("AI 코치와 연결할 수 없습니다. 서버 상태를 확인해 주세요.")
            setIsLoading(false)
        }
    }

    return (
        <>
            <div className="flex-1 w-full h-full flex flex-col items-center px-4 py-4 md:px-8 relative">
                {/* 🌟 챗봇들과 완벽히 동일한 '앱 윈도우' 스타일의 메인 카드 */}
                <div className="w-full max-w-3xl flex-1 min-h-0 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                    {/* 1. 상단 고정 헤더 (루틴 테마: 블루) */}
                    <div className="bg-blue-50/50 p-5 border-b border-blue-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md shadow-blue-200">
                                <Dumbbell className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold text-slate-800">루틴 세부 설정</h1>
                                <p className="text-xs text-blue-600 font-medium">
                                    목표와 장비를 선택하면 AI가 최적의 루틴을 설계합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. 스크롤 가능한 폼 영역 (flex-1 overflow-y-auto) */}
                    <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 bg-white">
                        {/* 컨디션 연동 알림 */}
                        {domsSummary && (
                            <div className="bg-blue-50/50 p-4 rounded-xl flex items-start border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-blue-900">홈 화면에서 연동된 컨디션</p>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        {domsSummary} AI가 이를 반영하여 부상 부위의 볼륨을 조절합니다.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 타겟 근육 섹션 */}
                        <section>
                            <h2 className="flex items-center text-base font-bold text-slate-800 mb-4">
                                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                타겟 근육 (다중 선택)
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {MUSCLES.map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => toggleArrayItem("target_muscles", item.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                            formData.target_muscles.includes(item.value)
                                                ? "bg-blue-500 text-white shadow-md shadow-blue-100 border-blue-500"
                                                : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* 가용 시간 섹션 */}
                        <section>
                            <h2 className="flex items-center text-base font-bold text-slate-800 mb-4">
                                <Clock className="w-5 h-5 mr-2 text-emerald-500" />
                                가용 시간:{" "}
                                <span className="text-emerald-600 ml-1.5">{formData.time_available_min}분</span>
                            </h2>
                            <div className="px-2">
                                <input
                                    type="range"
                                    min="30"
                                    max="120"
                                    step="15"
                                    value={formData.time_available_min}
                                    onChange={(e) =>
                                        setFormData({ ...formData, time_available_min: parseInt(e.target.value) })
                                    }
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-300 px-1">
                                    <span>30분</span>
                                    <span>120분</span>
                                </div>
                            </div>
                        </section>

                        {/* 훈련 목표 섹션 */}
                        <section>
                            <h2 className="flex items-center text-base font-bold text-slate-800 mb-4">
                                <Target className="w-5 h-5 mr-2 text-purple-500" />
                                훈련 목표
                            </h2>
                            <select
                                value={formData.goal}
                                onChange={(e) => setFormData({ ...formData, goal: e.target.value as TrainingGoal })}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-slate-700 text-sm"
                            >
                                <option value="HYPERTROPHY">근비대 (근육 크기 증가)</option>
                                <option value="STRENGTH">스트렝스 (최대 근력 증가)</option>
                                <option value="ENDURANCE">근지구력 (다이어트/체력)</option>
                            </select>
                        </section>

                        {/* 사용 장비 섹션 */}
                        <section>
                            <h2 className="flex items-center text-base font-bold text-slate-800 mb-4">
                                <Dumbbell className="w-5 h-5 mr-2 text-orange-500" />
                                사용 가능한 장비
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {EQUIPMENTS.map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => toggleArrayItem("equipment", item.value)}
                                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                                            formData.equipment.includes(item.value)
                                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                                : "border-slate-100 bg-white text-slate-400"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* 추가 요청 섹션 */}
                        <section className="pb-4">
                            <h2 className="text-base font-bold text-slate-800 mb-4">AI 코치에게 남길 말 (선택)</h2>
                            <textarea
                                value={formData.user_note}
                                onChange={(e) => setFormData({ ...formData, user_note: e.target.value })}
                                placeholder="예: 무릎이 안 좋으니 스쿼트는 빼주세요."
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-28 resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
                            />
                        </section>
                    </div>

                    {/* 3. 하단 고정 버튼 영역 */}
                    <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || formData.target_muscles.length === 0}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        >
                            <Send className="w-5 h-5 mr-2" />
                            나만의 AI 루틴 생성하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 🌟 로딩 오버레이 (기존 유지) */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-11/12 text-center transform transition-all scale-100 animate-in zoom-in-95">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-50"></div>
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center relative z-10">
                                <Dumbbell className="w-8 h-8 animate-spin" style={{ animationDuration: "3s" }} />
                            </div>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">AI 코치 분석 중</h3>
                        <p
                            className="text-slate-500 font-medium h-12 flex items-center justify-center transition-opacity duration-300"
                            key={loadingMsgIndex}
                        >
                            {LOADING_MESSAGES[loadingMsgIndex]}
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
