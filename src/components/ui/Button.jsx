import { cn } from '../../utils/cn'

const variants = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm border border-transparent',
  secondary:
    'bg-white text-[var(--color-text)] border border-[var(--color-border)] hover:bg-slate-50',
  ghost: 'bg-transparent text-[var(--color-text-muted)] hover:bg-slate-100 border border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm',
  accent:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] border border-transparent shadow-sm',
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

/**
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> & {
 *   variant?: keyof typeof variants
 *   size?: keyof typeof sizes
 *   loading?: boolean
 *   leftIcon?: React.ReactNode
 * }} props
 */
export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  leftIcon,
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      ) : (
        <>
          {leftIcon}
          {children}
        </>
      )}
      {loading ? <span className="sr-only">Loading</span> : null}
    </button>
  )
}
