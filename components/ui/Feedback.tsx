import { Info, TriangleAlert } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cx } from "./cx"

export function Skeleton({ className, ...rest }: ComponentProps<"div">) {
    return <div aria-hidden className={cx("animate-pulse rounded-control bg-hairline motion-reduce:animate-none", className)} {...rest} />
}

type EmptyStateProps = {
    icon?: ReactNode
    title: string
    body?: string
    action?: ReactNode
    className?: string
}

/** Empty screens teach the next step: a headline naming the space, one line of why, one action. */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
    return (
        <div className={cx("flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
            {icon && <div className="mb-1 text-ink-3 [&_svg]:size-7">{icon}</div>}
            <p className="text-body font-bold text-ink">{title}</p>
            {body && <p className="max-w-[28ch] text-body-sm text-ink-2">{body}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    )
}

type NoticeProps = ComponentProps<"div"> & { tone?: "info" | "danger"; title?: string }

export function Notice({ tone = "info", title, className, children, ...rest }: NoticeProps) {
    const Icon = tone === "danger" ? TriangleAlert : Info
    return (
        <div
            role={tone === "danger" ? "alert" : "status"}
            className={cx(
                "flex gap-2.5 rounded-panel border px-3 py-2.5 text-body-sm",
                tone === "danger" ? "border-danger/30 bg-danger-bg text-danger-ink" : "border-hairline bg-surface text-ink",
                className,
            )}
            {...rest}
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
                {title && <p className="font-bold">{title}</p>}
                {children}
            </div>
        </div>
    )
}
