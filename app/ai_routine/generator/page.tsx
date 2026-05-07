"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Activity,
    Clock,
    Target,
    Dumbbell,
    Send,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    Shield,
    RefreshCw,
} from "lucide-react"
import AnatomyModel from "@/app/components/AnatomyModel"
import { RoutineFormState, assembleRoutineRequest } from "@/utils/requestAssembler"
import { getUserPreferences } from "@/services/userDataService"
import { generateRoutine } from "@/services/aiRoutineService"
import { GenerateState } from "@/types/state"

type Equipment = "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT"

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

const EQUIPMENTS: { label: string; value: Equipment }[] = [
    { label: "바벨", value: "BARBELL" },
    { label: "덤벨", value: "DUMBBELL" },
    { label: "머신", value: "MACHINE" },
    { label: "케이블", value: "CABLE" },
    { label: "맨몸", value: "BODYWEIGHT" },
]

const PRESET_GROUPS = {
    PUSH: ["chest", "front-deltoids", "triceps"],
    PULL: ["upper-back", "trapezius", "biceps", "forearm", "back-deltoids"],
    LEGS: ["quadriceps", "hamstring", "gluteal", "calves", "adductor", "abductors"],
    CORE: ["abs", "lower-back", "obliques"],
}

const GOAL_MAP: Record<string, RoutineFormState["goal"]> = {
    strength: "STRENGTH",
    hypertrophy: "HYPERTROPHY",
    fatLoss: "ENDURANCE",
    recomposition: "ENDURANCE",
    generalFitness: "ENDURANCE",
}

export default function RoutineGenerator() {
    const router = useRouter()
    const [status, setStatus] = useState<GenerateState>("idle")
    const [isPrefsLoading, setIsPrefsLoading] = useState(true)
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)

    const [formData, setFormData] = useState<RoutineFormState>({
        targetMuscles: [],
        equipment: ["BODYWEIGHT"],
        timeAvailable: 60,
        painAreas: [],
        domsData: {},
        goal: "HYPERTROPHY",
        userNote: "",
    })

    // 🌟 AnatomyModel용 데이터 상태 (선택된 근육은 1점, 아니면 없는 것으로 취급)
    const [targetModelData, setTargetModelData] = useState<Record<string, number>>({})

    const domsSummary = useMemo(() => {
        const count = Object.keys(formData.domsData).length
        return count > 0 ? `현재 ${count}개 부위에 피로도가 감지되었습니다.` : ""
    }, [formData.domsData])

    useEffect(() => {
        const savedDoms = localStorage.getItem("fitcore_doms_data")
        const savedPainAreas = localStorage.getItem("fitcore_pain_areas")

        // 1. "undefined" 문자열과 파싱 에러를 막아주는 안전망 함수
        const safeParse = <T,>(value: string | null, fallback: T): T => {
            if (!value || value === "undefined") return fallback
            try {
                return JSON.parse(value) as T
            } catch {
                return fallback
            }
        }

        // 2. 안전망 함수를 통과시켜서 파싱
        const parsedDoms = safeParse<Record<string, number>>(savedDoms, {})
        const parsedPainAreas = safeParse<string[]>(savedPainAreas, [])

        getUserPreferences()
            .then((prefs) => {
                setFormData((prev) => ({
                    ...prev,
                    domsData: parsedDoms,
                    painAreas: parsedPainAreas,
                    timeAvailable: prefs.timeAvailable,
                    equipment: (prefs.equipment || []) as RoutineFormState["equipment"],
                    goal: GOAL_MAP[prefs.goal] ?? "HYPERTROPHY",
                }))
            })
            .catch(() => {
                // preferences 로드 실패 시 DOMS 데이터만 반영
                setFormData((prev) => ({
                    ...prev,
                    domsData: parsedDoms,
                    painAreas: parsedPainAreas,
                }))
            })
            .finally(() => setIsPrefsLoading(false))
    }, [])

    useEffect(() => {
        if (status !== "loading") return
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
        }, 1800)
        return () => {
            clearInterval(interval)
            setLoadingMsgIndex(0)
        }
    }, [status])

    const handlePresetClick = (groupKey: keyof typeof PRESET_GROUPS) => {
        const musclesToAdd = PRESET_GROUPS[groupKey]

        setTargetModelData((prev) => {
            const newData = { ...prev }
            musclesToAdd.forEach((m) => {
                newData[m] = 1
            })
            return newData
        })

        setFormData((prev: RoutineFormState) => {
            const current = new Set(prev.targetMuscles)
            musclesToAdd.forEach((m) => current.add(m))
            return { ...prev, targetMuscles: Array.from(current) }
        })
    }

    const handleTargetMuscleClick = (muscleName: string) => {
        setTargetModelData((prev) => {
            const newData = { ...prev }
            if (newData[muscleName]) delete newData[muscleName]
            else newData[muscleName] = 1
            return newData
        })

        setFormData((prev: RoutineFormState) => {
            const current = prev.targetMuscles
            if (current.includes(muscleName)) {
                return { ...prev, targetMuscles: current.filter((m: string) => m !== muscleName) }
            } else {
                return { ...prev, targetMuscles: [...current, muscleName] }
            }
        })
    }

    const handleResetClick = () => {
        setTargetModelData({})
        setFormData((prev: RoutineFormState) => ({ ...prev, targetMuscles: [] }))
    }

    const toggleArrayItem = (key: keyof RoutineFormState, value: string) => {
        setFormData((prev: RoutineFormState) => {
            const currentArray = prev[key] as string[]
            if (currentArray.includes(value)) {
                return { ...prev, [key]: currentArray.filter((item) => item !== value) }
            } else {
                return { ...prev, [key]: [...currentArray, value] }
            }
        })
    }

    const handleSubmit = async () => {
        setStatus("loading")
        try {
            const payload = assembleRoutineRequest(formData)
            const routineDraft = await generateRoutine(payload)
            localStorage.setItem("fitcore_active_routine", JSON.stringify(routineDraft))
            setStatus(routineDraft.isFallback ? "fallback" : "success")
            router.push("/routine/draft")
        } catch {
            setStatus("retryableFailed")
        }
    }

    return (
        <>
            <div className="flex-1 w-full h-full flex flex-col items-center px-4 py-4 md:px-8 relative">
                <div className="w-full max-w-3xl flex-1 min-h-0 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                    {/* 1. 상단 고정 헤더 */}
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

                    {/* 2. 폼 영역 */}
                    <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 bg-white">
                        {isPrefsLoading && (
                            <div className="flex items-center justify-center py-6 text-slate-400 text-sm font-medium animate-pulse">
                                사용자 설정을 불러오는 중...
                            </div>
                        )}
                        {!isPrefsLoading && domsSummary && (
                            <div className="bg-blue-50/50 p-4 rounded-xl flex items-start border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-blue-900">홈 화면에서 연동된 컨디션</p>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        {domsSummary} AI가 이를 반영하여 피로/부상 부위의 볼륨을 조절합니다.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 🌟 타겟 근육 섹션 교체 */}
                        <section>
                            <h2 className="flex items-center text-base font-bold text-slate-800 mb-4">
                                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                오늘 운동 부위 선택
                            </h2>

                            {/* 4분할 퀵 프리셋 버튼 + 리셋 버튼*/}
                            <div className="grid grid-cols-5 gap-1.5 mb-4">
                                {/* PUSH */}
                                <button
                                    onClick={() => handlePresetClick("PUSH")}
                                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group active:scale-95"
                                >
                                    <ArrowUp className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mb-1" />
                                    <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-blue-600">
                                        PUSH
                                    </span>
                                </button>

                                {/* PULL */}
                                <button
                                    onClick={() => handlePresetClick("PULL")}
                                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group active:scale-95"
                                >
                                    <ArrowDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mb-1" />
                                    <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-blue-600">
                                        PULL
                                    </span>
                                </button>

                                {/* LEGS */}
                                <button
                                    onClick={() => handlePresetClick("LEGS")}
                                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group active:scale-95"
                                >
                                    <Activity className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mb-1" />
                                    <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-blue-600">
                                        LEGS
                                    </span>
                                </button>

                                {/* CORE */}
                                <button
                                    onClick={() => handlePresetClick("CORE")}
                                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group active:scale-95"
                                >
                                    <Shield className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mb-1" />
                                    <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-blue-600">
                                        CORE
                                    </span>
                                </button>

                                {/* RESET */}
                                <button
                                    onClick={handleResetClick}
                                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all group active:scale-95"
                                >
                                    <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-red-500 mb-1" />
                                    <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-red-600">
                                        RESET
                                    </span>
                                </button>
                            </div>

                            {/* 인체 모형 */}
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <AnatomyModel
                                    data={targetModelData}
                                    onMuscleClick={handleTargetMuscleClick}
                                    mode="target"
                                />
                            </div>
                        </section>

                        {/* 가용 시간 섹션 */}
                        <section>
                            <h2 className="flex items-center text-base font-bold text-slate-800 mb-4">
                                <Clock className="w-5 h-5 mr-2 text-emerald-500" />
                                가용 시간: <span className="text-emerald-600 ml-1.5">{formData.timeAvailable}분</span>
                            </h2>
                            <div className="px-2">
                                <input
                                    type="range"
                                    min="30"
                                    max="120"
                                    step="15"
                                    value={formData.timeAvailable}
                                    onChange={(e) =>
                                        setFormData({ ...formData, timeAvailable: parseInt(e.target.value) })
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
                                onChange={(e) =>
                                    setFormData({ ...formData, goal: e.target.value as RoutineFormState["goal"] })
                                }
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
                                        className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                                            formData.equipment?.includes(item.value)
                                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                                : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
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
                                value={formData.userNote}
                                onChange={(e) => setFormData({ ...formData, userNote: e.target.value })}
                                placeholder="예: 무릎이 안 좋으니 스쿼트는 빼주세요."
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-28 resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
                            />
                        </section>
                    </div>

                    {/* 3. 하단 고정 버튼 영역 */}
                    <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                        <button
                            onClick={handleSubmit}
                            disabled={status === "loading" || formData.targetMuscles.length === 0}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        >
                            <Send className="w-5 h-5 mr-2" />
                            나만의 AI 루틴 생성하기
                        </button>
                    </div>
                </div>
            </div>

            {/* 에러 오버레이 */}
            {status === "retryableFailed" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-11/12 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">연결 오류</h3>
                        <p className="text-slate-500 font-medium mb-6 leading-relaxed">
                            서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.
                        </p>
                        <button
                            onClick={handleSubmit}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            재시도
                        </button>
                    </div>
                </div>
            )}

            {/* 로딩 스켈레톤 — 드래프트 페이지처럼 보이는 전체화면 오버레이 */}
            {status === "loading" && (
                <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in fade-in duration-200">
                    {/* 가짜 헤더 — 진행 바 + 로딩 메시지 */}
                    <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
                        <div className="flex justify-between items-end mb-2 max-w-2xl mx-auto">
                            <div className="flex items-center gap-2">
                                <Dumbbell
                                    className="w-5 h-5 text-orange-500 shrink-0"
                                    style={{ animation: "spin 3s linear infinite" }}
                                />
                                <div className="h-4 w-36 bg-slate-200 rounded-full animate-pulse" />
                            </div>
                            <div className="h-3.5 w-16 bg-slate-100 rounded-full animate-pulse" />
                        </div>
                        <div className="max-w-2xl mx-auto h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-300 rounded-full animate-pulse"
                                style={{ width: "30%" }}
                            />
                        </div>
                        <p
                            className="text-xs text-blue-500 font-medium mt-2 text-center animate-pulse"
                            key={loadingMsgIndex}
                        >
                            {LOADING_MESSAGES[loadingMsgIndex]}
                        </p>
                    </div>

                    {/* 스켈레톤 운동 블록 카드 3장 */}
                    <div className="p-4 max-w-2xl mx-auto space-y-5 mt-4">
                        {[72, 56, 64].map((titleWidth, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
                            >
                                {/* 카드 헤더 (다크 배경) */}
                                <div className="p-5 bg-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-600 shrink-0" />
                                        <div
                                            className="h-4 bg-slate-600 rounded-full"
                                            style={{ width: `${titleWidth}%` }}
                                        />
                                    </div>
                                    <div className="h-3 bg-slate-700 rounded-full mt-3 ml-11 w-4/5" />
                                </div>

                                {/* 세트 행 */}
                                <div className="p-4 space-y-3">
                                    {/* 컬럼 헤더 */}
                                    <div className="grid grid-cols-[1.5rem_1fr_1fr_3.5rem_1.5rem] gap-x-2 px-1">
                                        {[6, 8, 8, 10, 6].map((w, j) => (
                                            <div
                                                key={j}
                                                className="h-2.5 bg-slate-100 rounded-full"
                                                style={{ width: `${w * 4}px` }}
                                            />
                                        ))}
                                    </div>
                                    {/* 세트 3개 */}
                                    {[0, 1, 2].map((j) => (
                                        <div
                                            key={j}
                                            className="grid grid-cols-[1.5rem_1fr_1fr_3.5rem_1.5rem] gap-x-2 items-center"
                                        >
                                            <div className="h-4 w-4 bg-slate-100 rounded-full mx-auto" />
                                            <div className="h-9 bg-slate-100 rounded-xl" />
                                            <div className="h-9 bg-slate-100 rounded-xl" />
                                            <div className="h-9 bg-slate-100 rounded-xl" />
                                            <div className="h-4 w-4 bg-slate-100 rounded-full mx-auto" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
