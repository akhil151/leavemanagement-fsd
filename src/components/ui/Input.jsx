import { forwardRef } from 'react'
import { cn } from '../../utils/cn'
import { Label } from './Label'

/**
 * @param {React.InputHTMLAttributes<HTMLInputElement> & {
 *   label?: string
 *   hint?: string
 *   error?: string | null
 *   id?: string
 * }} props
 */
export const Input = forwardRef(function Input(
  { className, label, hint, error, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  return (
    <div className="w-full space-y-1.5">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full h-10 px-3 rounded-md border bg-white dark:bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text)]',
          'border-[var(--color-border)] placeholder:text-[var(--color-text-subtle)]',
          'transition-colors duration-150 hover:border-slate-300',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-err`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})
