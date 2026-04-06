import { forwardRef } from 'react'
import { cn } from '../../utils/cn'
import { Label } from './Label'

/**
 * @param {React.SelectHTMLAttributes<HTMLSelectElement> & {
 *   label?: string
 *   error?: string | null
 *   hint?: string
 * }} props
 */
export const Select = forwardRef(function Select(
  { className, label, error, hint, id, children, ...rest },
  ref,
) {
  const sid = id ?? rest.name
  return (
    <div className="w-full space-y-1.5">
      {label ? <Label htmlFor={sid}>{label}</Label> : null}
      <select
        ref={ref}
        id={sid}
        className={cn(
          'w-full h-10 px-3 rounded-md border bg-white dark:bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text)]',
          'border-[var(--color-border)] transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]',
          error && 'border-red-400',
          className,
        )}
        aria-invalid={!!error}
        {...rest}
      >
        {children}
      </select>
      {hint && !error ? (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})
