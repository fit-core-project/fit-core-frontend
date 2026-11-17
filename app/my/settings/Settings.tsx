"use client"

import { markManualLogout } from "@/lib/axios/authRedirect"
import { useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { useSettingsStore } from "@/store/settingsStore"
import { useAuthStore } from "@/store/authStore"
import profileApiClient from "@/lib/api/profile/profileApiClient"
import { clearOnboardingFlags } from "@/lib/api/profile/onboardingFlag"
import { Button, Notice, Section, Sheet, ToggleChip } from "@/components/ui"

const APP_VERSION = "0.1.0"
const CONTACT_EMAIL = "tpwls6478@gmail.com"

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

function LinkRow({ href, label }: { href: string; label: string }) {
    return (
        <Link href={href} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 text-body font-medium text-ink hover:bg-surface">
            {label}
            <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
        </Link>
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

function defaultAfterWithdraw() {
    markManualLogout()
    clearOnboardingFlags()
    // withdrawn: also drop this account's in-progress workout and failed-save backup on the device
    useAuthStore.getState().logout({ withdrawn: true })
    window.location.href = "/login"
}

function WithdrawSection({ onWithdrawn }: { onWithdrawn: () => void }) {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const close = () => {
        if (!submitting) setOpen(false)
    }

    const withdraw = async () => {
        setSubmitting(true)
        try {
            await profileApiClient.withdraw()
            toast.success("탈퇴했어요. 그동안 이용해 주셔서 고마워요.")
            onWithdrawn()
        } catch {
            toast.error("탈퇴하지 못했어요. 잠시 후 다시 시도하세요.")
            setSubmitting(false)
        }
    }

    return (
        <>
            <Section title="계정">
                <div className="rounded-panel border border-hairline bg-ground">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left text-body font-medium text-danger-ink hover:bg-danger-bg"
                    >
                        회원 탈퇴
                        <ChevronRight className="size-5 shrink-0" aria-hidden />
                    </button>
                </div>
            </Section>

            <Sheet
                open={open}
                onClose={close}
                title="정말 탈퇴할까요?"
                description="탈퇴하면 되돌릴 수 없어요."
                footer={
                    <div className="grid grid-cols-3 gap-2">
                        <Button variant="secondary" size="lg" onClick={close} disabled={submitting}>
                            취소
                        </Button>
                        <Button variant="danger" size="lg" className="col-span-2" loading={submitting} onClick={() => void withdraw()}>
                            {submitting ? "탈퇴하고 있어요" : "탈퇴하기"}
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-4 text-body-sm text-ink">
                    <div>
                        <p className="font-bold">바로 지워지는 정보</p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink-2">
                            <li>이름, 닉네임, 이메일, 프로필 사진, 성별, 생년월일</li>
                            <li>체중·체지방률, 체성분 기록, 통증 부위, 근육통 기록, 기준 중량</li>
                            <li>운동 목표·장비 같은 운동 설정과 메모</li>
                            <li>카카오·네이버·구글 로그인 연결 (이전 로그인으로도 접속할 수 없어요)</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-bold">30일 뒤 완전히 지워지는 정보</p>
                        <p className="mt-1.5 text-ink-2">
                            운동 기록, 식단 기록과 영양 목표, AI 루틴 기록은 입력한 통증·근육통, 메모, 음식 이름과 함께 계정 정보와 분리된 채
                            30일 동안 보관하다가 계정과 함께 완전히 지워요. 그동안에도 다시 볼 수 없고, 지운 뒤에는 되살릴 수 없어요. 바로
                            지우고 싶다면 탈퇴하기 전에 문의 메일로 요청해 주세요.
                        </p>
                    </div>
                    <Notice>같은 소셜 계정으로 다시 가입하면 새 계정으로 시작해요. 이전 기록은 옮겨지지 않아요.</Notice>
                    <p className="text-ink-2">
                        자세한 내용은{" "}
                        <Link href="/privacy" className="font-bold text-ink underline underline-offset-2">
                            개인정보 처리방침
                        </Link>
                        에서 볼 수 있어요.
                    </p>
                </div>
            </Sheet>
        </>
    )
}

export default function Settings({ onWithdrawn = defaultAfterWithdraw }: { onWithdrawn?: () => void }) {
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
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink underline underline-offset-2"
                        >
                            이메일 보내기
                        </a>
                    </SettingRow>
                    <LinkRow href="/terms" label="이용약관" />
                    <LinkRow href="/privacy" label="개인정보 처리방침" />
                </div>
            </Section>

            <WithdrawSection onWithdrawn={onWithdrawn} />
        </div>
    )
}
