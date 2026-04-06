import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import { Button } from './Button'

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   title: string
 *   description?: string
 *   children: React.ReactNode
 *   footer?: React.ReactNode
 *   size?: 'sm' | 'md' | 'lg'
 * }} props
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const width =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative z-10 w-full rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] shadow-[var(--shadow-floating)]',
          width,
          'motion-safe:animate-[modal-in_0.15s_ease-out]',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-[var(--color-text)]">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-sm text-[var(--color-text-muted)] mt-1">
                {description}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 -mr-1" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="px-5 py-4 max-h-[min(70vh,560px)] overflow-y-auto">{children}</div>
        {footer ? (
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">

            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
