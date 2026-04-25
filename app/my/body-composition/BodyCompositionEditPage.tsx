import React, { useState } from "react"
import { BodyComposition } from "@/types/project"
import { Scale } from "lucide-react"

type props = {
    onCancel: () => void
    onSave: (formData: BodyComposition) => void
}

export const BodyCompositionEditPage = ({ onCancel, onSave }: props) => {
    const [formData, setFormData] = useState<BodyComposition | null>()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? (value === "" ? undefined : parseFloat(value)) : value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData) {
            onSave(formData)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-xl border border-gray-100 space-y-6 relative" // space-y-10 -> space-y-6
        >
            {/* 헤더 섹션 */}
            <div className="space-y-1">
                <Scale className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">체성분 정보</h2>
            </div>
            <section className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    {/* 측정일 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">측정일</label>
                        <input
                            type="date"
                            name="measuredAt"
                            value={formData?.measuredAt || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 측정 소스/기기 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">측정 기기/출처</label>
                        <input
                            type="text"
                            name="source"
                            value={formData?.source || ""}
                            onChange={handleChange}
                            placeholder="예: 인바디, 애플워치 등"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 체중 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">체중 (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="bodyWeightKg"
                            value={formData?.bodyWeightKg || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 골격근량 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">골격근량 (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="skeletalMuscleMassKg"
                            value={formData?.skeletalMuscleMassKg || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 체지방량 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">체지방량 (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="bodyFatMassKg"
                            value={formData?.bodyFatMassKg || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 체지방률 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">체지방률 (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="bodyFatPct"
                            value={formData?.bodyFatPct || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 제지방량 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">제지방량 (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="fatFreeMassKg"
                            value={formData?.fatFreeMassKg || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* 내장지방 레벨 */}
                    <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-gray-500">내장지방 레벨</label>
                        <input
                            type="number"
                            name="visceralFatLevel"
                            value={formData?.visceralFatLevel || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* WHR */}
                    <div className="space-y-0.5 col-span-1 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-500">허리엉덩이비율 (WHR)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="waistHipRatio"
                            value={formData?.waistHipRatio || ""}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
            </section>
            <div className="sticky bottom-0 -mx-8 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-3 z-50">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex-1"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        className="flex-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                    >
                        저장하기
                    </button>
                </div>
            </div>
        </form>
    )
}
