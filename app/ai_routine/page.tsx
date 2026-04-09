"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, ArrowRight, CheckCircle2 } from "lucide-react"

// DOMS 점수 타입 (0: 정상, 1: 약간 뻐근, 2: 매우 뻐근, 3: 통증)
type DomsLevel = 0 | 1 | 2 | 3

// 관리가 필요한 주요 근육/관절 리스트
const BODY_PARTS = [
    { id: "CHEST", label: "가슴" },
    { id: "BACK", label: "등/광배" },
    { id: "SHOULDER", label: "어깨" },
    { id: "LOWER_BACK", label: "허리 (요추)" },
    { id: "LEG_QUADS", label: "앞벅지" },
    { id: "LEG_HAMSTRINGS", label: "뒷벅지" },
    { id: "KNEE", label: "무릎 관절" },
]

export default function RoutineHome() {
    const router = useRouter()

    // DOMS 상태 관리: Record<부위ID, 점수>
    const [domsData, setDomsData] = useState<Record<string, DomsLevel>>({})

    // 부위 클릭 핸들러: 0 -> 1 -> 2 -> 3 -> 0 순환
    const handleBodyPartClick = (partId: string) => {
        setDomsData((prev) => {
            const currentLevel = prev[partId] || 0
            const nextLevel = ((currentLevel + 1) % 4) as DomsLevel

            const newData = { ...prev }
            if (nextLevel === 0) {
                delete newData[partId] // 0점이면 데이터에서 아예 제거
            } else {
                newData[partId] = nextLevel
            }
            return newData
        })
    }

    // 점수에 따른 UI 색상 반환
    const getLevelColor = (level: number) => {
        switch (level) {
            case 1:
                return "bg-yellow-100 text-yellow-800 border-yellow-300" // 1점: 노란색
            case 2:
                return "bg-orange-100 text-orange-800 border-orange-400" // 2점: 주황색
            case 3:
                return "bg-red-100 text-red-800 border-red-500 font-bold" // 3점: 빨간색
            default:
                return "bg-white text-gray-500 border-gray-200 hover:bg-gray-50" // 0점: 기본
        }
    }

    const getLevelText = (level: number) => {
        switch (level) {
            case 1:
                return "약간 뻐근 (1점)"
            case 2:
                return "매우 뻐근 (2점)"
            case 3:
                return "통증/부상 (3점)"
            default:
                return ""
        }
    }

    // 다음 화면(Generator)으로 이동
    const handleNext = () => {
        // 🌟 데이터를 URL 쿼리 파라미터나 로컬 스토리지에 담아서 보냅니다.
        // 여기서는 가장 간단하고 안전한 로컬 스토리지를 사용합니다.
        localStorage.setItem("fitcore_doms_data", JSON.stringify(domsData))
        router.push("/ai_routine/generator")
    }

    // 현재 선택된 부위(1점 이상) 목록 필터링
    const activeDoms = Object.entries(domsData).filter(([_, level]) => level > 0)

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[85vh] max-h-[800px]">
                {/* 상단 헤더 */}
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                        <Activity className="w-48 h-48 -mt-10 -mr-10" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2 relative z-10">오늘의 컨디션 체크</h1>
                    <p className="text-slate-300 text-sm relative z-10">
                        현재 뻐근하거나 아픈 부위를 터치해주세요.
                        <br />
                        (터치할 때마다 강도가 올라갑니다 / 이후 2D혹은 3D 인체 구조에서 터치하는 방식으로 변경할 예정)
                    </p>
                </div>

                {/* 중앙 인터랙티브 바디 리스트 (스크롤 영역) */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="grid grid-cols-2 gap-3">
                        {BODY_PARTS.map((part) => {
                            const currentLevel = domsData[part.id] || 0
                            return (
                                <button
                                    key={part.id}
                                    onClick={() => handleBodyPartClick(part.id)}
                                    className={`
                    relative p-4 rounded-2xl border-2 text-left transition-all active:scale-95
                    ${getLevelColor(currentLevel)}
                  `}
                                >
                                    <div className="font-bold text-sm md:text-base">{part.label}</div>

                                    {/* 상태 텍스트 (1점 이상일 때만 표시) */}
                                    <div className="h-4 mt-1">
                                        {currentLevel > 0 && (
                                            <span className="text-xs font-medium opacity-80">
                                                {getLevelText(currentLevel)}
                                            </span>
                                        )}
                                    </div>

                                    {/* 3점일 때 아이콘 오버레이 */}
                                    {currentLevel === 3 && (
                                        <div className="absolute top-2 right-2 flex space-x-1">
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 하단 서머리 및 다음 버튼 */}
                <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                    <div className="mb-4 h-12 flex flex-col justify-end">
                        {activeDoms.length > 0 ? (
                            <p className="text-sm text-gray-600 flex items-center">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" />
                                <span className="font-bold text-gray-900 mr-1">{activeDoms.length}개</span> 부위에
                                피로도가 있습니다.
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500 flex items-center">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                선택된 통증 부위가 없습니다. 최상의 컨디션!
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleNext}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center group"
                    >
                        루틴 세부 설정하기
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </main>
    )
}
