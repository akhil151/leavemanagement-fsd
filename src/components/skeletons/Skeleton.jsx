import { cn } from '../../utils/cn'

/**
 * @param {{ className?: string }} props
 */
export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]',
        className,
      )}
      aria-hidden
    />
  )
}

/**
 * @param {{ count?: number }} props
 */
export function TableRowSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/**
 * Three stat cards
 */
export function BalanceCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-5 space-y-3 bg-white">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
