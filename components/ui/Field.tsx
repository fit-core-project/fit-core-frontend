"use client"

import { useId, type ComponentProps, type ReactNode } from "react"
import { cx } from "./cx"

type FieldShellProps = {
    label: string
    hint?: string
    error?: string
    optional?: boolean
    children: (ids: { inputId: string; describedBy?: string; invalid: boolean }) => ReactNode
}

function FieldShell({ label, hint, error, optional, children }: FieldShellProps) {
    const inputId = useId()
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`
    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-body-sm font-medium text-ink">
                {label}
                {optional && <span className="ml-1 font-normal text-ink-2">(선택)</span>}
            </label>
            {children({ inputId, describedBy, invalid: Boolean(error) })}
            {hint && !error && (
                <p id={hintId} className="text-caption text-ink-2">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} role="alert" className="text-caption text-danger-ink">
                    {error}
                </p>
            )}
        </div>
    )
}

const CONTROL =
    "w-full rounded-control border border-rail bg-ground px-3 text-body text-ink transition-[border-color] duration-150 hover:border-ink-3 aria-[invalid=true]:border-danger"

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
    label: string
    hint?: string
    error?: string
    optional?: boolean
    suffix?: string
}

export function TextField({ label, hint, error, optional, suffix, className, ...rest }: TextFieldProps) {
    return (
        <FieldShell label={label} hint={hint} error={error} optional={optional}>
            {({ inputId, describedBy, invalid }) => (
                <div className="relative">
                    <input
                        id={inputId}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        className={cx(CONTROL, "min-h-12", suffix && "pr-12", className)}
                        {...rest}
                    />
                    {suffix && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body-sm text-ink-2">
                            {suffix}
                        </span>
                    )}
                </div>
            )}
        </FieldShell>
    )
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
    label: string
    hint?: string
    error?: string
    optional?: boolean
}

export function TextAreaField({ label, hint, error, optional, className, rows = 3, ...rest }: TextAreaFieldProps) {
    return (
        <FieldShell label={label} hint={hint} error={error} optional={optional}>
            {({ inputId, describedBy, invalid }) => (
                <textarea
                    id={inputId}
                    rows={rows}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    className={cx(CONTROL, "resize-none py-2.5", className)}
                    {...rest}
                />
            )}
        </FieldShell>
    )
}
