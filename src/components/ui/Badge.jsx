import { cn } from '../../utils/cn'

const variants = {
  default:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  success:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
  warning:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800',
  danger:
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
  info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800',
  muted: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-600',
}

/**
 * @param {React.HTMLAttributes<HTMLSpanElement> & {
 *   variant?: keyof typeof variants
 * }} props
 */
export function Badge({ className, variant = 'default', children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

/**
 * @param {{ status: 'pending' | 'approved' | 'rejected' }} props
 */
export function StatusBadge({ status }) {
  const map = {
    pending: { variant: /** @type {const} */ ('warning'), label: 'Pending' },
    approved: { variant: /** @type {const} */ ('success'), label: 'Approved' },
    rejected: { variant: /** @type {const} */ ('danger'), label: 'Rejected' },
  }
  const m = map[status]
  return (
    <Badge variant={m.variant} className="uppercase tracking-wide">
      {m.label}
    </Badge>
  )
}
