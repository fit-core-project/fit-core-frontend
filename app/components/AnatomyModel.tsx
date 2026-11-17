import Model, { MuscleType, type IExerciseData, type Muscle } from "react-body-highlighter"
import { ChevronDown, Lock } from "lucide-react"
import { lineForRoutine, ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import { muscleLabel, PAIN_AREA_SLUGS, TRAINABLE_MUSCLE_SLUGS } from "@/utils/displayLabels"
import { cx, ToggleChip } from "@/components/ui"

interface AnatomyModelProps {
    data: Record<string, number>
    onMuscleClick: (muscle: string) => void
    mode: "doms" | "target" | "injury"
    lockedMuscles?: readonly string[]
}

/*
 * One palette, used for both the fill and the legend. react-body-highlighter colors each muscle with
 * highlightedColors[frequency - 1], so every muscle goes into exactly one entry whose frequency is the
 * index of its color. No overlay layers or blend modes: what the legend shows is what gets painted.
 */
const BODY_COLOR = "var(--color-rail)"

/** Condition check: soreness steps are ink tones; a locked pain area is the single danger color. */
const DOMS_PALETTE = {
    normal: BODY_COLOR,
    stiff: "var(--color-ink-2)",
    sore: "var(--color-ink)",
    locked: "var(--color-danger)",
} as const

/** Generator: each selected muscle takes its split line color; muscles outside the four lines use ink. */
const TARGET_LINES: readonly RouteLine[] = ["push", "pull", "legs", "core", "mixed"]
const TARGET_COLORS = TARGET_LINES.map((line) => ROUTE_LINE_COLOR_VAR[line])

/** The library throws on slugs it does not draw (e.g. side-deltoids), so only drawable muscles are painted. */
const DRAWABLE = new Set<string>(Object.values(MuscleType))

function entry(name: string, muscles: string[], frequency: number): IExerciseData[] {
    const drawable = muscles.filter((muscle) => DRAWABLE.has(muscle)) as Muscle[]
    return drawable.length > 0 ? [{ name, muscles: drawable, frequency }] : []
}

function buildPaint(mode: AnatomyModelProps["mode"], data: Record<string, number>, lockedMuscles: readonly string[]) {
    const locked = new Set(lockedMuscles)
    const active = Object.keys(data).filter((key) => data[key] > 0 && !locked.has(key))

    if (mode === "doms") {
        return {
            colors: [DOMS_PALETTE.stiff, DOMS_PALETTE.sore, DOMS_PALETTE.locked],
            exercises: [
                ...entry("stiff", active.filter((key) => data[key] === 1), 1),
                ...entry("sore", active.filter((key) => data[key] >= 2), 2),
                ...entry("locked", [...locked], 3),
            ],
        }
    }

    if (mode === "injury") {
        return {
            colors: [DOMS_PALETTE.locked],
            exercises: entry("injury", [...active, ...locked], 1),
        }
    }

    return {
        colors: [...TARGET_COLORS, DOMS_PALETTE.locked],
        exercises: [
            ...TARGET_LINES.flatMap((line, index) =>
                entry(line, active.filter((key) => lineForRoutine(null, [key]) === line), index + 1),
            ),
            ...entry("locked", [...locked], TARGET_LINES.length + 1),
        ],
    }
}

const DOMS_STATE_LABEL = ["정상", "뻐근함", "근육통"] as const

/**
 * Parts for the accessible list: the SSOT vocabulary for the mode, plus any part already in the data or locked
 * that the vocabulary does not list (e.g. a saved slug the diagram cannot draw), so the list always shows state.
 */
export function bodyPartListFor(mode: AnatomyModelProps["mode"], data: Record<string, number>, lockedMuscles: readonly string[]): string[] {
    const base: readonly string[] = mode === "injury" ? PAIN_AREA_SLUGS : TRAINABLE_MUSCLE_SLUGS
    const extras = [...lockedMuscles, ...Object.keys(data).filter((key) => data[key] > 0)].filter((slug) => !base.includes(slug))
    return [...base, ...Array.from(new Set(extras))]
}

function BodyPartList({ mode, data, lockedMuscles, onMuscleClick }: AnatomyModelProps & { lockedMuscles: readonly string[] }) {
    const parts = bodyPartListFor(mode, data, lockedMuscles)
    const locked = new Set(lockedMuscles)
    const legend = mode === "doms" ? "누를 때마다 정상, 뻐근함, 근육통 순서로 바뀌어요." : "누르면 고르고, 다시 누르면 빼요."

    return (
        <details className="group mt-4 w-full rounded-panel border border-hairline">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-body-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                목록에서 부위 고르기
                <ChevronDown className="size-4 shrink-0 text-ink-2 transition-transform duration-150 group-open:rotate-180" aria-hidden />
            </summary>
            <fieldset className="border-t border-hairline px-3 pb-3 pt-2">
                <legend className="sr-only">신체 부위</legend>
                <p className="mb-2 text-caption text-ink-2">{legend}</p>
                <ul className="flex flex-wrap gap-2">
                    {parts.map((slug) => {
                        const label = muscleLabel(slug)
                        if (locked.has(slug)) {
                            return (
                                <li key={slug}>
                                    <button
                                        type="button"
                                        aria-disabled="true"
                                        onClick={() => onMuscleClick(slug)}
                                        className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-danger bg-danger-bg px-3 text-body-sm font-medium text-danger-ink"
                                    >
                                        <Lock className="size-3.5" aria-hidden />
                                        {label}
                                        <span className="text-caption">· 통증(프로필)</span>
                                    </button>
                                </li>
                            )
                        }
                        const level = data[slug] ?? 0
                        if (mode === "doms") {
                            const step = Math.min(2, Math.max(0, level))
                            return (
                                <li key={slug}>
                                    <button
                                        type="button"
                                        onClick={() => onMuscleClick(slug)}
                                        aria-pressed={step > 0}
                                        className={cx(
                                            "inline-flex min-h-11 items-center gap-1 rounded-control border px-3 text-body-sm font-medium",
                                            step === 0 && "border-rail bg-ground text-ink hover:border-ink-3",
                                            step === 1 && "border-transparent bg-ink-2 text-white",
                                            step === 2 && "border-transparent bg-ink text-white",
                                        )}
                                    >
                                        {label}
                                        <span className="text-caption">· {DOMS_STATE_LABEL[step]}</span>
                                    </button>
                                </li>
                            )
                        }
                        return (
                            <li key={slug}>
                                <ToggleChip
                                    pressed={level > 0}
                                    line={mode === "target" ? lineForRoutine(null, [slug]) : undefined}
                                    onClick={() => onMuscleClick(slug)}
                                >
                                    {label}
                                </ToggleChip>
                            </li>
                        )
                    })}
                </ul>
            </fieldset>
        </details>
    )
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-full" style={{ background: color }} />
            <span className="text-caption text-ink-2">{label}</span>
        </li>
    )
}

export default function AnatomyModel({ data, onMuscleClick, mode, lockedMuscles = [] }: AnatomyModelProps) {
    const { colors, exercises } = buildPaint(mode, data, lockedMuscles)

    return (
        <div className="flex w-full select-none flex-col items-center">
            <div className="flex w-full flex-row items-start justify-center gap-4">
                {(["anterior", "posterior"] as const).map((type) => (
                    <figure key={type} className="flex w-36 flex-col items-center gap-2">
                        <figcaption className="text-caption font-medium text-ink-2">
                            {type === "anterior" ? "앞" : "뒤"}
                        </figcaption>
                        <Model
                            type={type}
                            data={exercises}
                            bodyColor={BODY_COLOR}
                            highlightedColors={colors}
                            style={{ width: "100%" }}
                            onClick={(event) => onMuscleClick(event.muscle)}
                        />
                    </figure>
                ))}
            </div>

            {mode === "doms" && (
                <ul aria-label="색 범례" className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    <LegendItem color={DOMS_PALETTE.normal} label="정상" />
                    <LegendItem color={DOMS_PALETTE.stiff} label="뻐근함" />
                    <LegendItem color={DOMS_PALETTE.sore} label="근육통" />
                    {lockedMuscles.length > 0 && <LegendItem color={DOMS_PALETTE.locked} label="통증(프로필)" />}
                </ul>
            )}

            <BodyPartList mode={mode} data={data} lockedMuscles={lockedMuscles} onMuscleClick={onMuscleClick} />
        </div>
    )
}
