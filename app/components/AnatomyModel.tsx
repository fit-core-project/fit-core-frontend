import React from "react"
import Model, { IExerciseData, Muscle } from "react-body-highlighter"

interface AnatomyModelProps {
    data: Record<string, number>
    onMuscleClick: (muscle: string) => void
    mode: "doms" | "target"
}

export default function AnatomyModel({ data, onMuscleClick, mode }: AnatomyModelProps) {
    // 1. 선택된 모든 근육을 하나의 배열로 추출 (라이브러리가 '활성화'로 인식하게 만듦)
    const allSelectedMuscles = Object.keys(data).filter((k) => data[k] > 0) as Muscle[]

    const mappedData: IExerciseData[] = [{ name: "Selected", muscles: allSelectedMuscles }]

    // 🌟 2. 마법의 코드: 상태(data)를 읽어들여 실시간으로 CSS를 찍어냅니다.
    // 라이브러리가 만들어내는 <path class="chest"> 등을 직접 타격(!important)합니다.
    const generateDynamicStyles = () => {
        if (mode === "target") {
            return allSelectedMuscles
                .map(
                    (muscle) => `
                svg path.${muscle}, svg path#${muscle} { fill: #3b82f6 !important; }
            `
                )
                .join("\n")
        }

        // DOMS 모드: 점수에 따라 각기 다른 색상 부여
        return Object.entries(data)
            .map(([muscle, level]) => {
                if (level === 3) return `svg path.${muscle}, svg path#${muscle} { fill: #ef4444 !important; }` // 빨강 (통증)
                if (level === 2) return `svg path.${muscle}, svg path#${muscle} { fill: #f97316 !important; }` // 주황 (매우 뻐근)
                if (level === 1) return `svg path.${muscle}, svg path#${muscle} { fill: #eab308 !important; }` // 노랑 (뻐근)
                return ""
            })
            .join("\n")
    }

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full select-none relative">
            {/* 🌟 생성된 CSS를 현재 DOM에 주입 */}
            <style dangerouslySetInnerHTML={{ __html: generateDynamicStyles() }} />

            {/* 전면 */}
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest">FRONT</span>
                <Model
                    type="anterior"
                    data={mappedData}
                    style={{ width: "12rem", height: "auto" }}
                    onClick={(e) => onMuscleClick(e.muscle)}
                />
            </div>

            {/* 후면 */}
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest">BACK</span>
                <Model
                    type="posterior"
                    data={mappedData}
                    style={{ width: "12rem", height: "auto" }}
                    onClick={(e) => onMuscleClick(e.muscle)}
                />
            </div>
        </div>
    )
}
