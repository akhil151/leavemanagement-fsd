import { cn } from '../../utils/cn'

/**
 * @param {React.LabelHTMLAttributes<HTMLLabelElement>} props
 */
export function Label({ className, children, ...rest }) {
  return (
    <label
      className={cn('block text-xs font-medium text-[var(--color-text-muted)]', className)}
      {...rest}
    >
      {children}
    </label>
  )
}
