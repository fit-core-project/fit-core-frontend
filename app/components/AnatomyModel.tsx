import React from "react"
import Model, { IExerciseData, Muscle } from "react-body-highlighter"

interface AnatomyModelProps {
    data: Record<string, number>
    onMuscleClick: (muscle: string) => void
    mode: "doms" | "target" | "injury"
}

const COLORS = {
    level1: "#FFD600",
    level2: "#FF6600",
}

export default function AnatomyModel({ data, onMuscleClick, mode }: AnatomyModelProps) {
    const muscles2 = Object.keys(data).filter((k) => data[k] === 2) as Muscle[]
    const muscles1 = Object.keys(data).filter((k) => data[k] === 1) as Muscle[]
    const targetMuscles = Object.keys(data).filter((k) => data[k] > 0) as Muscle[]

    // 🌟 타겟 모드 (루틴 생성기)
    if (mode === "target" || mode === "injury") {
        const targetData: IExerciseData[] = [{ name: "Target", muscles: targetMuscles }]
        return (
            <div className="flex flex-col items-center w-full select-none">
                {/* 간격을 gap-4로 줄이고, 항상 가로(flex-row)로 배치되게 고정 */}
                <div className="flex flex-row items-center justify-center gap-4 md:gap-8 w-full">
                    {/* 모형 컨테이너 (w-36~w-44로 반응형 제어) */}
                    <div className="flex flex-col items-center w-36 md:w-44">
                        <span className="text-[10px] font-bold text-slate-400 mb-3 tracking-widest">FRONT</span>
                        <div className="w-full relative">
                            <Model
                                type="anterior"
                                data={targetData}
                                style={{ width: "100%" }}
                                onClick={(e) => onMuscleClick(e.muscle)}
                                highlightedColors={[mode === "injury" ? "#FF0000" : "#3b82f6"]}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col items-center w-36 md:w-44">
                        <span className="text-[10px] font-bold text-slate-400 mb-3 tracking-widest">BACK</span>
                        <div className="w-full relative">
                            <Model
                                type="posterior"
                                data={targetData}
                                style={{ width: "100%" }}
                                onClick={(e) => onMuscleClick(e.muscle)}
                                highlightedColors={[mode === "injury" ? "#FF0000" : "#3b82f6"]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // 🌟 DOMS 모드 (컨디션 체크)
    return (
        <div className="flex flex-col items-center w-full select-none">
            <div className="flex flex-row items-center justify-center gap-4 md:gap-8 w-full">
                {/* 전면 */}
                <div className="flex flex-col items-center w-36 md:w-44">
                    <span className="text-[10px] font-bold text-slate-400 mb-3 tracking-widest text-center w-full block">
                        FRONT
                    </span>
                    {/* SVG 겹치기 래퍼: 이제 높이를 지정하지 않아도 Layer 1이 공간을 잡아줍니다. */}
                    <div className="w-full relative">
                        <div className="w-full relative z-0 opacity-100">
                            <Model
                                type="anterior"
                                data={[]}
                                style={{ width: "100%" }}
                                onClick={(e) => onMuscleClick(e.muscle)}
                            />
                        </div>
                        {muscles1.length > 0 && (
                            <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none mix-blend-multiply">
                                <Model
                                    type="anterior"
                                    data={[{ name: "1", muscles: muscles1 }]}
                                    style={{ width: "100%" }}
                                    highlightedColors={[COLORS.level1]}
                                    bodyColor="transparent"
                                />
                            </div>
                        )}
                        {muscles2.length > 0 && (
                            <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none mix-blend-multiply">
                                <Model
                                    type="anterior"
                                    data={[{ name: "2", muscles: muscles2 }]}
                                    style={{ width: "100%" }}
                                    highlightedColors={[COLORS.level2]}
                                    bodyColor="transparent"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 후면 */}
                <div className="flex flex-col items-center w-36 md:w-44">
                    <span className="text-[10px] font-bold text-slate-400 mb-3 tracking-widest text-center w-full block">
                        BACK
                    </span>
                    <div className="w-full relative">
                        <div className="w-full relative z-0 opacity-100">
                            <Model
                                type="posterior"
                                data={[]}
                                style={{ width: "100%" }}
                                onClick={(e) => onMuscleClick(e.muscle)}
                            />
                        </div>
                        {muscles1.length > 0 && (
                            <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none mix-blend-multiply">
                                <Model
                                    type="posterior"
                                    data={[{ name: "1", muscles: muscles1 }]}
                                    style={{ width: "100%" }}
                                    highlightedColors={[COLORS.level1]}
                                    bodyColor="transparent"
                                />
                            </div>
                        )}
                        {muscles2.length > 0 && (
                            <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none mix-blend-multiply">
                                <Model
                                    type="posterior"
                                    data={[{ name: "2", muscles: muscles2 }]}
                                    style={{ width: "100%" }}
                                    highlightedColors={[COLORS.level2]}
                                    bodyColor="transparent"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 범례 UI */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-5 bg-white px-5 py-3.5 rounded-2xl shadow-sm border border-slate-100 w-fit mx-auto">
                <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#e2e8f0] shadow-inner"></span>
                    <span className="text-xs font-bold text-slate-600">정상</span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="w-3.5 h-3.5 rounded-full shadow-inner"
                        style={{ backgroundColor: COLORS.level1 }}
                    ></span>
                    <span className="text-xs font-bold text-slate-600">뻐근함</span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="w-3.5 h-3.5 rounded-full shadow-inner"
                        style={{ backgroundColor: COLORS.level2 }}
                    ></span>
                    <span className="text-xs font-bold text-slate-600">근육통</span>
                </div>
            </div>
        </div>
    )
}
