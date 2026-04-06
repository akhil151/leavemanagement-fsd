import { forwardRef } from 'react'
import { cn } from '../../utils/cn'
import { Label } from './Label'

/**
 * @param {React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
 *   label?: string
 *   error?: string | null
 *   hint?: string
 * }} props
 */
export const Textarea = forwardRef(function Textarea(
  { className, label, error, hint, id, ...rest },
  ref,
) {
  const tid = id ?? rest.name
  return (
    <div className="w-full space-y-1.5">
      {label ? <Label htmlFor={tid}>{label}</Label> : null}
      <textarea
        ref={ref}
        id={tid}
        className={cn(
          'w-full min-h-[100px] px-3 py-2 rounded-md border bg-white dark:bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text)]',
          'border-[var(--color-border)] placeholder:text-[var(--color-text-subtle)]',
          'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]',
          error && 'border-red-400',
          className,
        )}
        aria-invalid={!!error}
        {...rest}
      />
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
