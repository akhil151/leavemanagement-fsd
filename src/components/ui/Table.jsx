import { cn } from '../../utils/cn'

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} props
 */
export function TableWrap({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/**
 * @param {React.TableHTMLAttributes<HTMLTableElement>} props
 */
export function Table({ className, ...rest }) {
  return <table className={cn('w-full text-sm text-left border-collapse', className)} {...rest} />
}

/**
 * @param {React.HTMLAttributes<HTMLTableSectionElement>} props
 */
export function THead({ className, ...rest }) {
  return (
    <thead
      className={cn(
        'bg-slate-50/80 text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] border-b border-[var(--color-border)]',
        className,
      )}
      {...rest}
    />
  )
}

/**
 * @param {React.HTMLAttributes<HTMLTableSectionElement>} props
 */
export function TBody({ className, ...rest }) {
  return <tbody className={cn('divide-y divide-[var(--color-border)]', className)} {...rest} />
}

/**
 * @param {React.HTMLAttributes<HTMLTableRowElement>} props
 */
export function Tr({ className, ...rest }) {
  return (
    <tr
      className={cn(
        'transition-colors duration-100 hover:bg-slate-50/80',
        className,
      )}
      {...rest}
    />
  )
}

/**
 * @param {React.ThHTMLAttributes<HTMLTableCellElement>} props
 */
export function Th({ className, ...rest }) {
  return (
    <th
      className={cn('px-4 py-3 font-medium whitespace-nowrap', className)}
      {...rest}
    />
  )
}

/**
 * @param {React.TdHTMLAttributes<HTMLTableCellElement>} props
 */
export function Td({ className, ...rest }) {
  return <td className={cn('px-4 py-3 text-[var(--color-text)] align-middle', className)} {...rest} />
}
