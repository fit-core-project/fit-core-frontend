import type { ComponentProps, CSSProperties } from "react"
import { ROUTE_LINE_COLOR_VAR, ROUTE_LINE_LABEL, type RouteLine } from "@/utils/routeLine"
import { cx } from "./cx"

export function LineBadge({ line, label, className }: { line: RouteLine; label?: string; className?: string }) {
    return (
        <span
            className={cx("inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-caption font-bold text-white", className)}
            style={{ background: ROUTE_LINE_COLOR_VAR[line] }}
        >
            {label ?? ROUTE_LINE_LABEL[line]}
        </span>
    )
}

type Tone = "neutral" | "danger"

export function Tag({ tone = "neutral", className, ...rest }: ComponentProps<"span"> & { tone?: Tone }) {
    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-caption font-medium",
                tone === "danger" ? "bg-danger-bg text-danger-ink" : "bg-surface text-ink-2",
                className,
            )}
            {...rest}
        />
    )
}

type ToggleChipProps = Omit<ComponentProps<"button">, "type"> & {
    pressed: boolean
    line?: RouteLine
}

/** Multi-select option. A real button with aria-pressed, so it works from keyboard and screen readers. */
export function ToggleChip({ pressed, line, className, style, ...rest }: ToggleChipProps) {
    const color = line ? ROUTE_LINE_COLOR_VAR[line] : "var(--color-ink)"
    return (
        <button
            type="button"
            aria-pressed={pressed}
            className={cx(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border px-3.5 text-body-sm font-medium transition-[background-color,border-color,color] duration-150",
                pressed ? "border-transparent bg-[var(--chip)] text-white" : "border-rail bg-ground text-ink hover:border-ink-3",
                className,
            )}
            style={{ "--chip": color, ...style } as CSSProperties}
            {...rest}
        />
    )
}
