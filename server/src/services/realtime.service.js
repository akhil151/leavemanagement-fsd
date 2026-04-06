/**
 * Socket.io fan-out (user-scoped rooms). Initialized after HTTP server starts.
 * For horizontal scaling, use @socket.io/redis-adapter with Redis pub/sub.
 */

/** @typedef {import('socket.io').Server} IOServer */

/** @type {IOServer | null} */
let ioRef = null

export function getIO() {
  return ioRef
}

/** @param {IOServer} io */
export function initRealtime(io) {
  ioRef = io
}

/**
 * @param {{
 *   requestId: string
 *   studentId: string
 *   studentName: string
 *   leaveType: string
 *   startDate: string
 *   endDate: string
 *   reason: string
 *   mentorUserId: string | null
 * }} payload
 */
export function emitLeaveApplied(payload) {
  if (!ioRef || !payload.mentorUserId) return
  ioRef.to(`user:${payload.mentorUserId}`).emit('leave_applied', payload)
}

/**
 * @param {{
 *   requestId: string
 *   studentId: string
 *   status: 'approved' | 'rejected'
 *   leaveType: string
 *   startDate: string
 *   endDate: string
 *   mentorComment?: string | null
 * }} payload
 */
export function emitLeaveUpdated(payload) {
  if (!ioRef || !payload.studentId) return
  ioRef.to(`user:${payload.studentId}`).emit('leave_updated', payload)
}
