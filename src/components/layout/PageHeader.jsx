import { cn } from '../../utils/cn'

/**
 * @param {{
 *   title: string
 *   description?: string
 *   actions?: React.ReactNode
 *   className?: string
 * }} props
 */
export function PageHeader({ title, description, actions, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--color-border)] pb-6',
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
        {description ? (
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </div>
  )
}
