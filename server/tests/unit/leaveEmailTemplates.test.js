import { describe, it, expect } from 'vitest'
import { buildLeaveSubmittedEmail, buildLeaveDecisionEmail } from '../../src/lib/leaveEmailTemplates.js'

describe('leaveEmailTemplates', () => {
  it('buildLeaveSubmittedEmail includes student, type, dates, reason for mentor', () => {
    const m = buildLeaveSubmittedEmail({
      studentName: 'Ananya K.',
      leaveType: 'casual',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      reason: 'Family event out of town.',
      audience: 'mentor',
    })
    expect(m.subject).toContain('Ananya')
    expect(m.subject).toContain('2026-04-01')
    expect(m.text).toContain('casual')
    expect(m.text).toContain('Family event')
    expect(m.html).toContain('Ananya')
  })

  it('buildLeaveDecisionEmail includes decision and optional mentor comment', () => {
    const d = buildLeaveDecisionEmail({
      studentName: 'Rahul M.',
      leaveType: 'sick',
      startDate: '2026-05-01',
      endDate: '2026-05-01',
      reason: 'Fever',
      decision: 'rejected',
      comment: 'Lab exam same day',
    })
    expect(d.subject.toLowerCase()).toContain('rejected')
    expect(d.text).toContain('Lab exam')
  })
})
