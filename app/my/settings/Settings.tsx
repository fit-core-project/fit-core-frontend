"use client"

import { useSettingsStore } from "@/store/settingsStore"
import { Section, ToggleChip } from "@/components/ui"

const APP_VERSION = "0.1.0"

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
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
                <p className="text-body font-medium text-ink">{label}</p>
                {description && <p className="mt-0.5 text-body-sm text-ink-2">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

function UnitToggle() {
    const { weightUnit, setWeightUnit } = useSettingsStore()
    return (
        <div className="flex gap-1.5" role="group" aria-label="무게 단위">
            {(["kg", "lbs"] as const).map((unit) => (
                <ToggleChip key={unit} pressed={weightUnit === unit} onClick={() => setWeightUnit(unit)} className="min-w-14">
                    {unit}
                </ToggleChip>
            ))}
        </div>
    )
}

export default function Settings() {
    return (
        <div className="flex flex-col gap-8 py-2">
            <Section title="표시">
                <div className="rounded-panel border border-hairline bg-ground">
                    <SettingRow label="무게 단위" description="루틴과 기록에 보이는 중량 단위">
                        <UnitToggle />
                    </SettingRow>
                </div>
            </Section>

            <Section title="앱 정보">
                <div className="divide-y divide-hairline rounded-panel border border-hairline bg-ground">
                    <SettingRow label="버전">
                        <p className="text-body-sm tabular-nums text-ink-2">{APP_VERSION}</p>
                    </SettingRow>
                    <SettingRow label="문의 / 피드백">
                        <a
                            href="mailto:tpwls6478@gmail.com"
                            className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink underline underline-offset-2"
                        >
                            이메일 보내기
                        </a>
                    </SettingRow>
                </div>
            </Section>
        </div>
    )
}
