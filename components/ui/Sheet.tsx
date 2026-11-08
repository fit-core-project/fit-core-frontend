"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { cx } from "./cx"

type SheetProps = {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
}

/** Bottom sheet on the native <dialog>: focus trap, Esc, and inert background come from the platform. */
export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
    const ref = useRef<HTMLDialogElement>(null)
    const titleId = useId()
    const descId = useId()

    useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    useEffect(() => {
        if (!open) return
        const root = document.documentElement
        const previous = root.style.overflow
        root.style.overflow = "hidden"
        return () => {
            root.style.overflow = previous
        }
    }, [open])

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            onCancel={(event) => {
                event.preventDefault()
                onClose()
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
            className={cx(
                "m-0 mt-auto mx-auto max-h-[85dvh] w-full max-w-[480px] overflow-hidden rounded-t-panel bg-ground p-0 text-ink shadow-[0_-8px_24px_rgba(20,33,61,0.12)]",
                "backdrop:bg-ink/40 overscroll-contain",
                open && "flex flex-col",
            )}
        >
            <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 pb-3 pt-4">
                <div className="min-w-0">
                    <h2 id={titleId} className="text-title-sm font-bold">
                        {title}
                    </h2>
                    {description && (
                        <p id={descId} className="mt-0.5 text-body-sm text-ink-2">
                            {description}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-surface"
                >
                    <X className="size-5" aria-hidden />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
            {footer && <div className="border-t border-hairline px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
        </dialog>
    )
}
