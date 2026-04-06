import { cn } from '../../utils/cn'

/**
 * @param {{
 *   icon?: React.ReactNode
 *   title: string
 *   description?: string
 *   action?: React.ReactNode
 *   className?: string
 * }} props
 */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg border border-dashed border-[var(--color-border)] bg-slate-50/50',
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 text-[var(--color-text-subtle)]" aria-hidden>
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      {description ? (
        <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
