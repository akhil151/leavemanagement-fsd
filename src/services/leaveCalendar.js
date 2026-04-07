import {
  addDays,
  eachDayOfInterval,
  format,
  isBefore,
  isWeekend,
  parseISO,
  startOfDay,
} from 'date-fns'

/**
 * @param {string} iso YYYY-MM-DD
 */
export function parseIso(iso) {
  return parseISO(iso)
}

/**
 * Business days between start and end (inclusive), excluding weekends and holiday ISO strings.
 * Half-day does not change the *range* — apply deduction separately.
 * @param {string} startIso
 * @param {string} endIso
 * @param {string[]} holidays
 */
export function countBusinessDaysInclusive(startIso, endIso, holidays = []) {
  if (!startIso || !endIso || startIso > endIso) return 0
  const holidaySet = new Set(holidays)
  const days = eachDayOfInterval({
    start: parseISO(startIso),
    end: parseISO(endIso),
  })
  return days.filter((d) => !isWeekend(d) && !holidaySet.has(format(d, 'yyyy-MM-dd'))).length
}

/**
 * Total calendar days inclusive (for display / legacy).
 */
export function countCalendarDaysInclusive(startIso, endIso) {
  if (!startIso || !endIso || startIso > endIso) return 0
  const s = parseISO(startIso)
  const e = parseISO(endIso)
  return eachDayOfInterval({ start: s, end: e }).length
}

/**
 * Deduct units for balance: full business days, or 0.5 for single-day half.
 * @param {number} businessDays
 * @param {'none'|'am'|'pm'} halfDay
 * @param {string} startIso
 * @param {string} endIso
 */
export function computeDeductUnits(businessDays, halfDay, startIso, endIso) {
  if (startIso === endIso && halfDay !== 'none') {
    return 0.5
  }
  return businessDays
}

/**
 * Dates disabled for picker: before minDate, holidays, overlapping existing ranges.
 * @param {{
 *   minDate?: Date
 *   holidays?: string[]
 *   blockedRanges?: { start: string; end: string }[]
 * }} opts
 */
export function buildDisabledMatchers(opts) {
  const { minDate, holidays = [], blockedRanges = [] } = opts
  const holidaySet = new Set(holidays)

  return (date) => {
    const d = startOfDay(date)
    const iso = format(d, 'yyyy-MM-dd')
    if (minDate && isBefore(d, startOfDay(minDate))) return true
    if (isWeekend(d)) return true
    if (holidaySet.has(iso)) return true
    for (const br of blockedRanges) {
      if (iso >= br.start && iso <= br.end) return true
    }
    return false
  }
}

/**
 * Suggest next windows of `length` business days avoiding holidays/weekends (greedy from `from`).
 * @param {string} fromIso
 * @param {number} lengthBusinessDays
 * @param {string[]} holidays
 * @param {number} maxSuggestions
 */
export function suggestLeaveWindows(fromIso, lengthBusinessDays, holidays = [], maxSuggestions = 3) {
  if (lengthBusinessDays < 1) return []
  const holidaySet = new Set(holidays)
  let cursor = startOfDay(parseISO(fromIso))
  const out = []
  let outerGuard = 0
  while (out.length < maxSuggestions && outerGuard < 400) {
    outerGuard++
    while (isWeekend(cursor) || holidaySet.has(format(cursor, 'yyyy-MM-dd'))) {
      cursor = addDays(cursor, 1)
    }
    let span = 0
    let end = cursor
    let walk = cursor
    let innerGuard = 0
    while (span < lengthBusinessDays && innerGuard < 500) {
      innerGuard++
      if (!isWeekend(walk) && !holidaySet.has(format(walk, 'yyyy-MM-dd'))) {
        span++
        end = walk
      }
      if (span >= lengthBusinessDays) break
      walk = addDays(walk, 1)
    }
    if (span >= lengthBusinessDays) {
      out.push({
        start: format(cursor, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      })
      cursor = addDays(end, 1)
    } else {
      break
    }
  }
  return out
}

/**
 * Suggest ranges that maximize total break duration by connecting leave days
 * with nearby weekends/holidays.
 * @param {string} fromIso
 * @param {number} maxLeaveDays
 * @param {string[]} holidays
 */
export function suggestExtendedBreaks(fromIso, maxLeaveDays, holidays = []) {
  if (!fromIso || maxLeaveDays < 1) return []
  const holidaySet = new Set(holidays)
  const start = startOfDay(parseISO(fromIso))
  const plans = []

  for (let offset = 0; offset <= 45; offset++) {
    const windowStart = addDays(start, offset)
    let leaveUsed = 0
    let cursor = windowStart
    let end = windowStart
    for (let i = 0; i < 12; i++) {
      const iso = format(cursor, 'yyyy-MM-dd')
      const offDay = isWeekend(cursor) || holidaySet.has(iso)
      if (!offDay) leaveUsed++
      if (leaveUsed > maxLeaveDays) break
      end = cursor
      cursor = addDays(cursor, 1)
    }
    if (leaveUsed < 1 || leaveUsed > maxLeaveDays) continue
    const totalSpan = eachDayOfInterval({ start: windowStart, end }).length
    plans.push({
      start: format(windowStart, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      leaveDays: leaveUsed,
      totalBreakDays: totalSpan,
      bonusDays: Math.max(0, totalSpan - leaveUsed),
    })
  }

  return plans
    .sort((a, b) => b.bonusDays - a.bonusDays || b.totalBreakDays - a.totalBreakDays)
    .slice(0, 3)
}
