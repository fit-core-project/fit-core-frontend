import type { ReactNode } from "react"
import { ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import { cx } from "./cx"

export type StationStatus = "done" | "current" | "upcoming"

export type StationData = {
    key: string
    title: ReactNode
    meta?: ReactNode
    /** Expanded body, typically shown only for the current station. */
    content?: ReactNode
    trailing?: ReactNode
    /** Per-station line; a change from the previous station reads as a transfer. */
    line?: RouteLine
    status?: StationStatus
}

type RouteProps = {
    stations: StationData[]
    line?: RouteLine
    /** plan: the whole route is drawn in line colour. progress: only the travelled part is. */
    mode?: "plan" | "progress"
    label: string
    className?: string
}

const RAIL = "var(--color-rail)"

type StationRowProps = {
    station: Omit<StationData, "key">
    color: string
    segmentColor?: string
    isCurrent: boolean
    isDone: boolean
    markerColor: string
    isLast: boolean
}

/** One station's marker, connector and body. Used by Route and by sortable lists that own their <li>. */
export function StationRow({ station, color, segmentColor, isCurrent, isDone, markerColor, isLast }: StationRowProps) {
    return (
        <div className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3">
            {segmentColor && (
                <span aria-hidden className="absolute left-[10px] top-[18px] bottom-[-6px] w-1" style={{ background: segmentColor }} />
            )}
            <span aria-hidden className="relative z-10 flex h-7 items-center justify-center">
                <span
                    className={cx("rounded-full", isCurrent ? "size-[22px] border-[5px]" : "size-[14px] border-[3px]")}
                    style={{
                        borderColor: isCurrent ? color : markerColor || color,
                        background: isDone ? markerColor || color : "var(--color-ground)",
                    }}
                />
            </span>
            <div className={cx("min-w-0 pb-5", isLast && "pb-0")}>
                <div className="flex min-h-7 items-center justify-between gap-2">
                    <div
                        className={cx(
                            "min-w-0 truncate",
                            isCurrent ? "text-title-sm font-bold" : "text-body font-medium",
                            isDone ? "text-ink-2" : "text-ink",
                        )}
                    >
                        {station.title}
                        {isDone && <span className="sr-only"> (완료)</span>}
                    </div>
                    {station.trailing}
                </div>
                {station.meta && <div className="mt-0.5 text-body-sm text-ink-2 tabular-nums">{station.meta}</div>}
                {station.content && <div className="mt-3">{station.content}</div>}
            </div>
        </div>
    )
}

export function Route({ stations, line = "mixed", mode = "plan", label, className }: RouteProps) {
    return (
        <ol aria-label={label} className={cx("flex flex-col", className)}>
            {stations.map((station, index) => {
                const color = ROUTE_LINE_COLOR_VAR[station.line ?? line]
                const next = stations[index + 1]
                const status = station.status ?? "upcoming"
                const segmentColor = !next
                    ? undefined
                    : mode === "plan"
                      ? ROUTE_LINE_COLOR_VAR[next.line ?? line]
                      : status === "done"
                        ? color
                        : RAIL
                const isCurrent = mode === "progress" && status === "current"
                const isDone = mode === "progress" && status === "done"
                const markerColor = mode === "progress" && status === "upcoming" ? RAIL : color

                return (
                    <li key={station.key} aria-current={isCurrent ? "step" : undefined}>
                        <StationRow
                            station={station}
                            color={color}
                            segmentColor={segmentColor}
                            isCurrent={isCurrent}
                            isDone={isDone}
                            markerColor={markerColor}
                            isLast={!next}
                        />
                    </li>
                )
            })}
        </ol>
    )
}

type RouteStripProps = {
    stops: string[]
    line: RouteLine
    label: string
    className?: string
    /** Draw the route in rail grey, for a route that does not exist yet (a guide, a placeholder). */
    muted?: boolean
}

/** Compact horizontal route for summaries: evenly spaced stops on one line, names beneath. */
export function RouteStrip({ stops, line, label, className, muted }: RouteStripProps) {
    const color = muted ? RAIL : ROUTE_LINE_COLOR_VAR[line]
    return (
        <ol aria-label={label} className={cx("grid", className)} style={{ gridTemplateColumns: `repeat(${Math.max(stops.length, 1)}, minmax(0, 1fr))` }}>
            {stops.map((stop, index) => (
                <li key={`${stop}-${index}`} className="relative flex flex-col items-center gap-1.5">
                    <span aria-hidden className="relative flex h-3.5 w-full items-center justify-center">
                        <span
                            className={cx("absolute top-1/2 h-1 -translate-y-1/2", index === 0 ? "left-1/2 right-0" : index === stops.length - 1 ? "left-0 right-1/2" : "inset-x-0")}
                            style={{ background: stops.length > 1 ? color : "transparent" }}
                        />
                        <span className="relative size-3.5 rounded-full border-[3px] bg-ground" style={{ borderColor: color }} />
                    </span>
                    <span className="w-full truncate px-0.5 text-center text-caption text-ink-2">{stop}</span>
                </li>
            ))}
        </ol>
    )
}
