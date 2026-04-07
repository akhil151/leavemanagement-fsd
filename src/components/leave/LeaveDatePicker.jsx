import { useMemo, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { startOfDay } from 'date-fns'
import { cn } from '../../utils/cn'
import { buildDisabledMatchers } from '../../services/leaveCalendar'

/**
 * @param {{
 *   range: import('react-day-picker').DateRange | undefined
 *   onSelect: (range: import('react-day-picker').DateRange | undefined) => void
 *   holidays?: string[]
 *   blockedRanges?: { start: string; end: string }[]
 *   suggestedDates?: { start: string; end: string }[]
 *   className?: string
 * }} props
 */
export function LeaveDatePicker({
  range,
  onSelect,
  holidays = [],
  blockedRanges = [],
  suggestedDates = [],
  className,
}) {
  // Stable reference — only needs to be today's date, doesn't change during a session
  const todayRef = useRef(startOfDay(new Date()))
  const today = todayRef.current

  const disabled = useMemo(() => {
    const base = buildDisabledMatchers({
      minDate: today,
      holidays,
      blockedRanges,
    })
    return (date) => base(date)
  }, [holidays, blockedRanges, today])

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-sm overflow-x-auto',
        'rdp-root--enterprise',
        className,
      )}
    >
      <div className="min-w-[320px]">
        <DayPicker
          mode="range"
          numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2}
          selected={range}
          onSelect={onSelect}
          disabled={disabled}
          showOutsideDays
          fixedWeeks
          classNames={{
            root: 'rdp-root w-full',
            months: 'flex flex-col sm:flex-row gap-6',
            month: 'space-y-3',
            caption_label: 'text-sm font-semibold text-[var(--color-text)] dark:text-white',
            nav_button:
              'inline-flex size-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:bg-slate-50 dark:hover:bg-gray-800',
            head_cell: 'text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)] dark:text-gray-400 w-9',
            cell: 'p-1',
            day: cn(
              'size-9 rounded-md text-sm font-medium',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-blue-500/20 dark:hover:bg-blue-500/20',
            ),
            day_selected: 'bg-blue-600 text-white font-semibold hover:bg-blue-600',
            day_range_start: 'bg-blue-600 text-white font-semibold rounded-l-md',
            day_range_end: 'bg-blue-600 text-white font-semibold rounded-r-md',
            day_range_middle: 'bg-blue-500/30 text-gray-900 dark:text-gray-200 rounded-none',
            day_disabled: 'text-gray-400 dark:text-gray-600 opacity-60 line-through',
            day_today: 'border border-blue-400',
          }}
          modifiers={{
            holiday: holidays.map((h) => new Date(h + 'T12:00:00')),
            suggested: suggestedDates.flatMap((r) => {
              try {
                return [{ from: new Date(r.start + 'T12:00:00'), to: new Date(r.end + 'T12:00:00') }]
              } catch {
                return []
              }
            }),
          }}
          modifiersClassNames={{
            holiday: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100',
            suggested:
              'bg-blue-500/20 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40',
          }}
        />
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-2 px-1">
        Weekends and institutional holidays are disabled. Dates overlapping existing pending or approved
        leave are blocked.
      </p>
    </div>
  )
}
