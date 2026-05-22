"use client"

import { useSettingsStore } from "@/store/settingsStore"

const APP_VERSION = "0.1.0"

function SectionHeader({ title }: { title: string }) {
    return <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
}

function SettingRow({
    label,
    description,
    children,
}: {
    label: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

function UnitToggle() {
    const { weightUnit, setWeightUnit } = useSettingsStore()
    return (
        <div className="flex rounded-lg bg-slate-100 p-0.5">
            {(["kg", "lbs"] as const).map((unit) => (
                <button
                    key={unit}
                    type="button"
                    onClick={() => setWeightUnit(unit)}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                        weightUnit === unit
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    {unit}
                </button>
            ))}
        </div>
    )
}

export default function Settings() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <SectionHeader title="표시 설정" />
                <SettingRow label="무게 단위" description="루틴 및 기록에 표시되는 중량 단위">
                    <UnitToggle />
                </SettingRow>
            </div>

            <div className="space-y-2">
                <SectionHeader title="앱 정보" />
                <div className="rounded-2xl bg-white shadow-sm divide-y divide-slate-50">
                    <div className="flex items-center justify-between px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">버전</p>
                        <p className="text-sm text-slate-400">{APP_VERSION}</p>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">문의 / 피드백</p>
                        <a
                            href="mailto:tpwls6478@gmail.com"
                            className="text-sm text-blue-500 hover:underline"
                        >
                            이메일 보내기
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
