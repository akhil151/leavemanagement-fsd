/** @typedef {'sick' | 'casual' | 'onDuty'} LeaveType */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * @param {string} email
 */
export function validateEmail(email) {
  if (!email?.trim()) return 'Email is required'
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address'
  return null
}

/**
 * @param {string} password
 */
export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return null
}

/**
 * @param {{ start: string; end: string; type: LeaveType; reason: string; file: File | null }} fields
 * @param {boolean} requireMedicalProof
 */
export function validateApplyLeave(fields, requireMedicalProof) {
  /** @type {Record<string, string>} */
  const errors = {}
  if (!fields.start) errors.start = 'Start date is required'
  if (!fields.end) errors.end = 'End date is required'
  if (fields.start && fields.end && fields.start > fields.end) {
    errors.end = 'End date must be on or after start date'
  }
  if (!fields.type) errors.type = 'Select a leave type'
  if (!fields.reason?.trim()) errors.reason = 'Reason is required'
  else if (fields.reason.trim().length < 10)
    errors.reason = 'Please provide at least 10 characters'
  if (requireMedicalProof && !fields.file) {
    errors.file = 'Medical proof is required for sick leave over 2 days'
  }
  return errors
}

/**
 * Sick leave over 2 calendar days may require proof (demo rule).
 * @param {string} start
 * @param {string} end
 */
export function sickLeaveNeedsProof(start, end) {
  if (!start || !end) return false
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1
  return diff > 2
}
