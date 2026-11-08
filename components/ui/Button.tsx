import Link from "next/link"
import { Loader2 } from "lucide-react"
import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { ROUTE_LINE_COLOR_VAR, type RouteLine } from "@/utils/routeLine"
import { cx } from "./cx"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost"
type Size = "md" | "lg"

type StyleProps = {
    variant?: Variant
    size?: Size
    /** Colors a primary button with a route line; defaults to ink. */
    line?: RouteLine
    block?: boolean
}

const VARIANT: Record<Variant, string> = {
    primary: "bg-[var(--btn-fill)] text-white hover:brightness-110 active:brightness-95",
    secondary: "border border-rail bg-ground text-ink hover:bg-surface active:bg-hairline",
    ghost: "text-ink hover:bg-surface active:bg-hairline",
    danger: "bg-danger text-white hover:brightness-110 active:brightness-95",
    "danger-ghost": "text-danger-ink hover:bg-danger-bg active:bg-danger-bg",
}

const SIZE: Record<Size, string> = {
    md: "min-h-11 px-4 text-body-sm",
    lg: "min-h-13 px-5 text-body",
}

function buttonClass({ variant = "secondary", size = "md", block }: StyleProps, className?: string) {
    return cx(
        "inline-flex items-center justify-center gap-2 rounded-control font-bold transition-[background-color,filter] duration-150 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
    )
}

function fillStyle(variant: Variant | undefined, line: RouteLine | undefined, style?: CSSProperties) {
    if (variant !== "primary") return style
    return { "--btn-fill": line ? ROUTE_LINE_COLOR_VAR[line] : "var(--color-ink)", ...style } as CSSProperties
}

type ButtonProps = StyleProps &
    ComponentProps<"button"> & {
        loading?: boolean
        icon?: ReactNode
    }

export function Button({ variant, size, line, block, loading, icon, className, style, children, disabled, type = "button", ...rest }: ButtonProps) {
    return (
        <button
            type={type}
            className={buttonClass({ variant, size, block }, className)}
            style={fillStyle(variant, line, style)}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : icon}
            {children}
        </button>
    )
}

type ButtonLinkProps = StyleProps & ComponentProps<typeof Link> & { icon?: ReactNode }

export function ButtonLink({ variant, size, line, block, icon, className, style, children, ...rest }: ButtonLinkProps) {
    return (
        <Link className={buttonClass({ variant, size, block }, className)} style={fillStyle(variant, line, style)} {...rest}>
            {icon}
            {children}
        </Link>
    )
}
