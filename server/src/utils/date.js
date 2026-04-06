/**
 * Inclusive calendar days between two ISO date strings (YYYY-MM-DD).
 * @param {string} start
 * @param {string} end
 */
export function inclusiveDays(start, end) {
  const s = new Date(`${start}T12:00:00.000Z`)
  const e = new Date(`${end}T12:00:00.000Z`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    throw new Error('Invalid date')
  }
  const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000)
  return diff + 1
}

/**
 * @param {string} a
 * @param {string} b
 */
export function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart
}
