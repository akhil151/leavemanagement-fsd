import { cn } from '../../utils/cn'

/**
 * @param {React.HTMLAttributes<HTMLDivElement> & { padding?: 'none' | 'sm' | 'md' }} props
 */
export function Card({ className, padding = 'md', children, ...rest }) {
  const p =
    padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5 sm:p-6'
  return (
    <div
      className={cn(
        'bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-card)]',
        p,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} props
 */
export function CardHeader({ className, ...rest }) {
  return <div className={cn('mb-4', className)} {...rest} />
}

/**
 * @param {React.HTMLAttributes<HTMLHeadingElement>} props
 */
export function CardTitle({ className, children, ...rest }) {
  return (
    <h3
      className={cn('text-sm font-semibold text-[var(--color-text)] tracking-tight', className)}
      {...rest}
    >
      {children}
    </h3>
  )
}

/**
 * @param {React.HTMLAttributes<HTMLParagraphElement>} props
 */
export function CardDescription({ className, ...rest }) {
  return (
    <p className={cn('text-sm text-[var(--color-text-muted)] mt-1', className)} {...rest} />
  )
}

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} props
 */
export function CardContent({ className, ...rest }) {
  return <div className={cn('space-y-4', className)} {...rest} />
}

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} props
 */
export function CardFooter({ className, ...rest }) {
  return (
    <div
      className={cn('mt-5 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-2', className)}
      {...rest}
    />
  )
}
