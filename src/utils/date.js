import { format } from 'date-fns'

/**
 * @param {import('react-day-picker').DateRange | undefined} range
 */
export function rangeToIso(range) {
  if (!range?.from) return { start: '', end: '' }
  const start = format(range.from, 'yyyy-MM-dd')
  const end = range.to ? format(range.to, 'yyyy-MM-dd') : start
  return { start, end }
}

/**
 * @param {string} isoDate
 */
export function formatDisplayDate(isoDate) {
  if (!isoDate) return '—'
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * @param {string} start
 * @param {string} end
 */
export function formatDateRange(start, end) {
  if (start === end) return formatDisplayDate(start)
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`
}

/**
 * @param {string} a
 * @param {string} b
 */
export function compareIsoDates(a, b) {
  return a.localeCompare(b)
}
