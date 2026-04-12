import React from "react"
import Model, { IExerciseData, Muscle } from "react-body-highlighter"

interface AnatomyModelProps {
    data: Record<string, number>
    onMuscleClick: (muscle: string) => void
    mode: "doms" | "target"
}

export default function AnatomyModel({ data, onMuscleClick, mode }: AnatomyModelProps) {
    // 점수별로 선택된 근육들을 따로따로 추출합니다.
    const muscles3 = Object.keys(data).filter((k) => data[k] === 3) as Muscle[]
    const muscles2 = Object.keys(data).filter((k) => data[k] === 2) as Muscle[]
    const muscles1 = Object.keys(data).filter((k) => data[k] === 1) as Muscle[]
    const targetMuscles = Object.keys(data).filter((k) => data[k] > 0) as Muscle[]

    // 타겟 모드일 때는 파란색 단일 모델만 렌더링 (간단함)
    if (mode === "target") {
        const targetData: IExerciseData[] = [{ name: "Target", muscles: targetMuscles }]
        return (
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full select-none">
                <div className="flex flex-col items-center relative">
                    <span className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest">FRONT</span>
                    <Model
                        type="anterior"
                        data={targetData}
                        style={{ width: "12rem" }}
                        onClick={(e) => onMuscleClick(e.muscle)}
                        highlightedColors={["#3b82f6"]}
                    />
                </div>
                <div className="flex flex-col items-center relative">
                    <span className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest">BACK</span>
                    <Model
                        type="posterior"
                        data={targetData}
                        style={{ width: "12rem" }}
                        onClick={(e) => onMuscleClick(e.muscle)}
                        highlightedColors={["#3b82f6"]}
                    />
                </div>
            </div>
        )
    }

    // 🌟 DOMS 모드 (핵심): 3개의 모델을 absolute로 겹쳐서 렌더링합니다.
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full select-none">
            {/* 전면 */}
            <div className="flex flex-col items-center relative w-[12rem] h-[24rem]">
                <span className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest text-center w-full block">
                    FRONT
                </span>

                {/* Layer 1: 기본 몸통 (아무 색상 없는 베이스) */}
                <div
                    className="absolute top-8 left-0 right-0 z-0 opacity-100"
                    onClick={(e) => {
                        const target = e.target as SVGPathElement
                        if (target.className.baseVal) onMuscleClick(target.className.baseVal)
                    }}
                >
                    <Model type="anterior" data={[]} style={{ width: "12rem" }} />
                </div>

                {/* Layer 2: 1점 근육 (노란색) */}
                {muscles1.length > 0 && (
                    <div className="absolute top-8 left-0 right-0 z-10 pointer-events-none mix-blend-multiply">
                        <Model
                            type="anterior"
                            data={[{ name: "1", muscles: muscles1 }]}
                            style={{ width: "12rem" }}
                            highlightedColors={["#eab308"]}
                        />
                    </div>
                )}

                {/* Layer 3: 2점 근육 (주황색) */}
                {muscles2.length > 0 && (
                    <div className="absolute top-8 left-0 right-0 z-20 pointer-events-none mix-blend-multiply">
                        <Model
                            type="anterior"
                            data={[{ name: "2", muscles: muscles2 }]}
                            style={{ width: "12rem" }}
                            highlightedColors={["#f97316"]}
                        />
                    </div>
                )}

                {/* Layer 4: 3점 근육 (빨간색) */}
                {muscles3.length > 0 && (
                    <div className="absolute top-8 left-0 right-0 z-30 pointer-events-none mix-blend-multiply">
                        <Model
                            type="anterior"
                            data={[{ name: "3", muscles: muscles3 }]}
                            style={{ width: "12rem" }}
                            highlightedColors={["#ef4444"]}
                        />
                    </div>
                )}
            </div>

            {/* 후면 */}
            <div className="flex flex-col items-center relative w-[12rem] h-[24rem]">
                <span className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest text-center w-full block">
                    BACK
                </span>

                {/* Layer 1: 기본 몸통 */}
                <div
                    className="absolute top-8 left-0 right-0 z-0 opacity-100"
                    onClick={(e) => {
                        const target = e.target as SVGPathElement
                        if (target.className.baseVal) onMuscleClick(target.className.baseVal)
                    }}
                >
                    <Model type="posterior" data={[]} style={{ width: "12rem" }} />
                </div>

                {/* Layer 2~4: 점수별 색상 오버레이 */}
                {muscles1.length > 0 && (
                    <div className="absolute top-8 left-0 right-0 z-10 pointer-events-none mix-blend-multiply">
                        <Model
                            type="posterior"
                            data={[{ name: "1", muscles: muscles1 }]}
                            style={{ width: "12rem" }}
                            highlightedColors={["#eab308"]}
                        />
                    </div>
                )}
                {muscles2.length > 0 && (
                    <div className="absolute top-8 left-0 right-0 z-20 pointer-events-none mix-blend-multiply">
                        <Model
                            type="posterior"
                            data={[{ name: "2", muscles: muscles2 }]}
                            style={{ width: "12rem" }}
                            highlightedColors={["#f97316"]}
                        />
                    </div>
                )}
                {muscles3.length > 0 && (
                    <div className="absolute top-8 left-0 right-0 z-30 pointer-events-none mix-blend-multiply">
                        <Model
                            type="posterior"
                            data={[{ name: "3", muscles: muscles3 }]}
                            style={{ width: "12rem" }}
                            highlightedColors={["#ef4444"]}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
