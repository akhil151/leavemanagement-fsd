import { describe, it, expect } from 'vitest'
import { inclusiveDays, datesOverlap } from '../../src/utils/date.js'

describe('date utils (edge cases for leave duration & overlap)', () => {
  it('inclusiveDays counts single day as 1', () => {
    expect(inclusiveDays('2026-04-10', '2026-04-10')).toBe(1)
  })

  it('inclusiveDays spans inclusive range', () => {
    expect(inclusiveDays('2026-04-10', '2026-04-12')).toBe(3)
  })

  it('datesOverlap detects partial overlap', () => {
    expect(datesOverlap('2026-04-01', '2026-04-05', '2026-04-04', '2026-04-10')).toBe(true)
  })

  it('datesOverlap returns false for adjacent non-overlapping ranges', () => {
    expect(datesOverlap('2026-04-01', '2026-04-03', '2026-04-04', '2026-04-05')).toBe(false)
  })
})
