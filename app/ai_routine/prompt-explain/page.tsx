import Link from "next/link"
import {
    Activity,
    ArrowLeft,
    CheckCircle2,
    Database,
    FileJson,
    Gauge,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react"

export const metadata = {
    title: "AI 루틴 프롬프트 설계 | Fit Core",
}

const sections = [
    {
        title: "User Context",
        icon: Activity,
        tone: "text-sky-600 bg-sky-50 border-sky-100",
        points: [
            "사용자가 선택한 targetSplitLabel, targetMuscles, readinessLevel을 루틴 목표로 정리합니다.",
            "pain areas, DOMS, unavailable equipment는 피해야 할 조건으로 분리해 모델에 전달합니다.",
            "표시 문구는 한국어를 우선하고, enum/id 값은 기존 계약을 유지합니다.",
        ],
    },
    {
        title: "Candidate Pool",
        icon: Database,
        tone: "text-emerald-600 bg-emerald-50 border-emerald-100",
        points: [
            "운동 카탈로그에서 후보를 먼저 좁히고 candidate_pool_size=12 범위로 모델 선택지를 제한합니다.",
            "후보에 없는 운동을 새로 만들지 않도록 hallucinated exercise 금지 규칙을 둡니다.",
            "운동명은 카탈로그의 한국어 표시 이름을 사용할 수 있습니다.",
        ],
    },
    {
        title: "Safety Constraints",
        icon: ShieldCheck,
        tone: "text-rose-600 bg-rose-50 border-rose-100",
        points: [
            "통증 부위, DOMS, unavailable equipment에 걸리는 운동은 제외 또는 강도 조절 대상입니다.",
            "set cap과 time budget으로 세트 수와 총 운동 시간을 데모 조건 안에 묶습니다.",
            "무리한 볼륨보다 수행 가능한 루틴을 우선합니다.",
        ],
    },
    {
        title: "Output Schema",
        icon: FileJson,
        tone: "text-violet-600 bg-violet-50 border-violet-100",
        points: [
            "응답은 JSON schema에 맞는 render-ready 구조로 요구합니다.",
            "summaryTitle, rationaleSummary, warnings, routineBlocks처럼 화면 표시 필드를 빠뜨리지 않습니다.",
            "정상 성공 흐름에서는 fallback=false 상태를 기대합니다.",
        ],
    },
    {
        title: "Rule Critic / Guard",
        icon: CheckCircle2,
        tone: "text-amber-600 bg-amber-50 border-amber-100",
        points: [
            "생성 후 Rule Critic이 후보 외 운동, 장비 위반, 세트 제한 초과를 다시 검사합니다.",
            "데모 성공 기준은 hard_violation_count=0입니다.",
            "가드가 위험한 항목을 발견하면 보정하거나 fallback 경로로 넘깁니다.",
        ],
    },
    {
        title: "Gemma4 Runtime Settings",
        icon: SlidersHorizontal,
        tone: "text-indigo-600 bg-indigo-50 border-indigo-100",
        points: [
            "Gemma4 local 환경에서 raw JSON invoke 방식으로 호출합니다.",
            "긴 루틴 설명을 위해 num_predict=4096, num_ctx=8192 설정을 사용합니다.",
            "실제 프롬프트 전문이나 실행 환경 값은 화면에 표시하지 않습니다.",
        ],
    },
    {
        title: "Telemetry / Evaluation",
        icon: Gauge,
        tone: "text-slate-600 bg-slate-50 border-slate-200",
        points: [
            "latency, candidate count, fallback 여부, hard violation 수를 요약해 품질을 확인합니다.",
            "면접 데모에서는 fallback=false, hard_violation_count=0, 생성 성공 여부를 빠르게 설명합니다.",
            "raw prompt, raw output, API key, env dump는 노출하지 않습니다.",
        ],
    },
]

export default function PromptExplainPage() {
    return (
        <main className="flex-1 h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-4 md:px-8 md:py-8">
                <header className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <Link
                        href="/ai_routine/generator"
                        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        루틴 생성으로 돌아가기
                    </Link>
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Prompt Engineering</p>
                        <h1 className="text-2xl font-extrabold leading-tight text-slate-900">
                            AI 루틴 생성 프롬프트 설계
                        </h1>
                        <p className="text-sm leading-6 text-slate-600">
                            실제 raw prompt 전문을 공개하지 않고, 입력 맥락, 안전 가드, 출력 스키마, 평가 지표만
                            데모용으로 요약합니다.
                        </p>
                    </div>
                </header>

                <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                    이 화면은 설명용 요약입니다. raw prompt, raw output, API key, env dump는 표시하지 않습니다.
                </section>

                <section className="space-y-3 pb-8" aria-label="프롬프트 설계 섹션">
                    {sections.map((section, index) => {
                        const Icon = section.icon
                        return (
                            <details
                                key={section.title}
                                className="group rounded-lg border border-slate-200 bg-white shadow-sm"
                                open={index === 0}
                            >
                                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                                    <span
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${section.tone}`}
                                    >
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-bold text-slate-900">{section.title}</span>
                                        <span className="mt-0.5 block text-xs text-slate-500">
                                            탭해서 핵심 규칙 보기
                                        </span>
                                    </span>
                                    <span className="text-lg font-bold text-slate-400 transition-transform group-open:rotate-45">
                                        +
                                    </span>
                                </summary>
                                <div className="border-t border-slate-100 px-4 pb-4 pt-1">
                                    <ul className="space-y-2">
                                        {section.points.map((point) => (
                                            <li key={point} className="flex gap-2 text-sm leading-6 text-slate-700">
                                                <CheckCircle2
                                                    className="mt-1 h-4 w-4 shrink-0 text-emerald-500"
                                                    aria-hidden="true"
                                                />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </details>
                        )
                    })}
                </section>
            </div>
        </main>
    )
}
