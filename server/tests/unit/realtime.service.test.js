import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initRealtime, emitLeaveApplied, emitLeaveUpdated } from '../../src/services/realtime.service.js'

describe('realtime.service', () => {
  beforeEach(() => {
    initRealtime(null)
  })

  it('emitLeaveApplied targets mentor user room with leave_applied', () => {
    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    initRealtime(io)
    emitLeaveApplied({
      requestId: '10',
      studentId: '1',
      studentName: 'S',
      leaveType: 'casual',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      reason: 'Test',
      mentorUserId: '99',
    })
    expect(io.to).toHaveBeenCalledWith('user:99')
    expect(emit).toHaveBeenCalledWith(
      'leave_applied',
      expect.objectContaining({ requestId: '10', mentorUserId: '99' }),
    )
  })

  it('emitLeaveApplied is a no-op without mentor', () => {
    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    initRealtime(io)
    emitLeaveApplied({
      requestId: '10',
      studentId: '1',
      studentName: 'S',
      leaveType: 'casual',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      reason: 'Test',
      mentorUserId: null,
    })
    expect(io.to).not.toHaveBeenCalled()
  })

  it('emitLeaveUpdated targets student room with leave_updated', () => {
    const emit = vi.fn()
    const io = { to: vi.fn(() => ({ emit })) }
    initRealtime(io)
    emitLeaveUpdated({
      requestId: '10',
      studentId: '42',
      status: 'approved',
      leaveType: 'sick',
      startDate: '2026-02-01',
      endDate: '2026-02-02',
      mentorComment: 'OK',
    })
    expect(io.to).toHaveBeenCalledWith('user:42')
    expect(emit).toHaveBeenCalledWith('leave_updated', expect.objectContaining({ status: 'approved' }))
  })
})
