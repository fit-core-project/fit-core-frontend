import Link from "next/link"
import { notFound } from "next/navigation"
import {
    Activity,
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronDown,
    Database,
    FileJson,
    Gauge,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react"
import { Notice } from "@/components/ui"

export const metadata = {
    title: "AI 루틴 프롬프트 설계 | Fit Core",
}

const sections = [
    {
        title: "User Context",
        icon: Activity,
        points: [
            "사용자가 선택한 targetSplitLabel, targetMuscles, readinessLevel을 루틴 목표로 정리해요.",
            "pain areas, DOMS, unavailable equipment는 피해야 할 조건으로 분리해 모델에 전달해요.",
            "표시 문구는 한국어를 우선하고, enum/id 값은 기존 계약을 유지해요.",
        ],
    },
    {
        title: "Candidate Pool",
        icon: Database,
        points: [
            "운동 카탈로그에서 후보를 먼저 좁히고 candidate_pool_size=12 범위로 모델 선택지를 제한해요.",
            "후보에 없는 운동을 새로 만들지 않도록 hallucinated exercise 금지 규칙을 둬요.",
            "운동명은 카탈로그의 한국어 표시 이름을 사용할 수 있어요.",
        ],
    },
    {
        title: "Safety Constraints",
        icon: ShieldCheck,
        points: [
            "통증 부위, DOMS, unavailable equipment에 걸리는 운동은 제외 또는 강도 조절 대상이에요.",
            "set cap과 time budget으로 세트 수와 총 운동 시간을 데모 조건 안에 묶어요.",
            "무리한 볼륨보다 수행 가능한 루틴을 우선해요.",
        ],
    },
    {
        title: "Output Schema",
        icon: FileJson,
        points: [
            "응답은 JSON schema에 맞는 render-ready 구조로 요구해요.",
            "summaryTitle, rationaleSummary, warnings, routineBlocks처럼 화면 표시 필드를 빠뜨리지 않아요.",
            "정상 성공 흐름에서는 fallback=false 상태를 기대해요.",
        ],
    },
    {
        title: "Rule Critic / Guard",
        icon: CheckCircle2,
        points: [
            "생성 후 Rule Critic이 후보 외 운동, 장비 위반, 세트 제한 초과를 다시 검사해요.",
            "데모 성공 기준은 hard_violation_count=0이에요.",
            "가드가 위험한 항목을 발견하면 보정하거나 fallback 경로로 넘겨요.",
        ],
    },
    {
        title: "Gemma4 Runtime Settings",
        icon: SlidersHorizontal,
        points: [
            "Gemma4 local 환경에서 raw JSON invoke 방식으로 호출해요.",
            "긴 루틴 설명을 위해 num_predict=4096, num_ctx=8192 설정을 사용해요.",
            "실제 프롬프트 전문이나 실행 환경 값은 화면에 표시하지 않아요.",
        ],
    },
    {
        title: "Telemetry / Evaluation",
        icon: Gauge,
        points: [
            "latency, candidate count, fallback 여부, hard violation 수를 요약해 품질을 확인해요.",
            "면접 데모에서는 fallback=false, hard_violation_count=0, 생성 성공 여부를 빠르게 설명해요.",
            "raw prompt, raw output, API key, env dump는 노출하지 않아요.",
        ],
    },
]

export default function PromptExplainPage() {
    // Interview/demo explainer: dev only, like app/dev/ui.
    if (process.env.NODE_ENV === "production") notFound()

    return (
        <div className="flex min-h-full w-full flex-col bg-ground">
            <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-hairline bg-ground px-2 py-1.5">
                <Link
                    href="/ai_routine/generator"
                    aria-label="루틴 세부 설정으로 돌아가기"
                    className="inline-flex size-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                >
                    <ArrowLeft className="size-5" aria-hidden />
                </Link>
                <span className="min-w-0 flex-1 truncate text-body font-bold text-ink">프롬프트 설계</span>
            </header>

            <main className="flex flex-1 flex-col gap-5 px-4 py-5">
                <div className="flex flex-col gap-2">
                    <h1 className="text-title font-bold text-ink">AI 루틴 프롬프트는 이렇게 설계했어요</h1>
                    <p className="text-body-sm text-ink-2">
                        실제 프롬프트 전문은 공개하지 않아요. 입력 맥락, 안전 가드, 출력 스키마, 평가 지표만 데모용으로
                        요약했어요.
                    </p>
                </div>

                <Notice>이 화면은 설명용 요약이에요. raw prompt, raw output, API key, env dump는 표시하지 않아요.</Notice>

                <section aria-label="프롬프트 설계 항목" className="flex flex-col gap-2 pb-8">
                    {sections.map((section, index) => {
                        const Icon = section.icon
                        return (
                            <details
                                key={section.title}
                                className="group rounded-panel border border-hairline bg-ground"
                                open={index === 0}
                            >
                                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                                    <Icon className="size-5 shrink-0 text-ink-2" aria-hidden />
                                    <span className="min-w-0 flex-1 text-body font-bold text-ink">{section.title}</span>
                                    <ChevronDown
                                        className="size-5 shrink-0 text-ink-2 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                                        aria-hidden
                                    />
                                </summary>
                                <ul className="flex flex-col gap-2 border-t border-hairline px-4 py-3">
                                    {section.points.map((point) => (
                                        <li key={point} className="flex gap-2 text-body-sm text-ink">
                                            <Check className="mt-1 size-4 shrink-0 text-ink-2" aria-hidden />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )
                    })}
                </section>
            </main>
        </div>
    )
}
