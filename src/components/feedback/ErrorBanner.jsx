import { cn } from '../../utils/cn'

/**
 * @param {{ message: string | null; onDismiss?: () => void; className?: string }} props
 */
export function ErrorBanner({ message, onDismiss, className }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900',
        className,
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </span>
      <p className="flex-1">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-800/80 hover:text-red-900 text-xs font-medium"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  )
}
