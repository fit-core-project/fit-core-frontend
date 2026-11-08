import type { ComponentProps, ReactNode } from "react"
import { cx } from "./cx"

type SurfaceProps = ComponentProps<"div"> & {
    tone?: "raised" | "sunken"
    padded?: boolean
}

/** One panel language for the app: hairline-bordered white, or the cool sunken surface. No shadows. */
export function Surface({ tone = "raised", padded = true, className, ...rest }: SurfaceProps) {
    return (
        <div
            className={cx(
                "rounded-panel",
                tone === "raised" ? "border border-hairline bg-ground" : "bg-surface",
                padded && "p-4",
                className,
            )}
            {...rest}
        />
    )
}

type SectionProps = ComponentProps<"section"> & { title: string; action?: ReactNode }

export function Section({ title, action, className, children, ...rest }: SectionProps) {
    return (
        <section className={cx("flex flex-col gap-3", className)} {...rest}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-title-sm font-bold text-ink">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    )
}
