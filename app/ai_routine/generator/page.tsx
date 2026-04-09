"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Activity, Clock, Target, Dumbbell, Send, AlertCircle, Loader2 } from "lucide-react"

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
            const response = await fetch("http://localhost:8000/api/ai/generate-routine", {
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
            <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center text-gray-800 pb-24">
                <div className="w-full max-w-3xl flex flex-col gap-6 animate-fade-in-up">
                    <div className="space-y-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">세부 설정</h1>
                            <p className="text-gray-500 text-sm">
                                목표와 장비를 선택하면 AI가 최적의 루틴을 설계합니다.
                            </p>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-xl flex items-start border border-blue-100">
                            <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-blue-900">홈 화면에서 연동된 컨디션</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    {domsSummary} AI가 이를 반영하여 볼륨과 종목을 조절합니다.
                                </p>
                            </div>
                        </div>

                        <section>
                            <h2 className="flex items-center text-lg font-semibold mb-3">
                                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                타겟 근육 (다중 선택)
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {MUSCLES.map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => toggleArrayItem("target_muscles", item.value)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                            formData.target_muscles.includes(item.value)
                                                ? "bg-blue-500 text-white shadow-md"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="flex items-center text-lg font-semibold mb-3">
                                <Clock className="w-5 h-5 mr-2 text-green-500" />
                                가용 시간: {formData.time_available_min}분
                            </h2>
                            <input
                                type="range"
                                min="30"
                                max="120"
                                step="15"
                                value={formData.time_available_min}
                                onChange={(e) =>
                                    setFormData({ ...formData, time_available_min: parseInt(e.target.value) })
                                }
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                        </section>

                        <section>
                            <h2 className="flex items-center text-lg font-semibold mb-3">
                                <Target className="w-5 h-5 mr-2 text-purple-500" />
                                훈련 목표
                            </h2>
                            <select
                                value={formData.goal}
                                onChange={(e) => setFormData({ ...formData, goal: e.target.value as TrainingGoal })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="HYPERTROPHY">근비대 (근육 크기 증가)</option>
                                <option value="STRENGTH">스트렝스 (최대 근력 증가)</option>
                                <option value="ENDURANCE">근지구력 (다이어트/체력)</option>
                            </select>
                        </section>

                        <section>
                            <h2 className="flex items-center text-lg font-semibold mb-3">
                                <Dumbbell className="w-5 h-5 mr-2 text-orange-500" />
                                사용 가능한 장비
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {EQUIPMENTS.map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => toggleArrayItem("equipment", item.value)}
                                        className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                                            formData.equipment.includes(item.value)
                                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                                : "border-gray-200 text-gray-500"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold mb-2">PT 선생님께 남길 말 (선택)</h2>
                            <textarea
                                value={formData.user_note}
                                onChange={(e) => setFormData({ ...formData, user_note: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-lg h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </section>

                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || formData.target_muscles.length === 0}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center disabled:bg-gray-300"
                        >
                            <Send className="w-5 h-5 mr-2" />
                            나만의 AI 루틴 생성하기
                        </button>
                    </div>
                </div>
            </main>

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

                        <div className="mt-4 flex space-x-1">
                            <div
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
