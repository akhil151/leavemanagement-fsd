/**
 * @typedef {Object} UserRow
 * @property {bigint | number} id
 * @property {string} email
 * @property {string} password_hash
 * @property {'student'|'teacher'|'admin'} role
 * @property {string} name
 * @property {string | null} student_code
 * @property {string | null} department
 * @property {string | null} parent_email
 * @property {bigint | number | null} mentor_id
 */

/**
 * @typedef {Object} LeaveBalanceRow
 * @property {bigint | number} user_id
 * @property {number} sick
 * @property {number} casual
 * @property {number} on_duty
 */

/**
 * @typedef {Object} LeaveRequestRow
 * @property {bigint | number} id
 * @property {bigint | number} student_id
 * @property {bigint | number | null} mentor_id
 * @property {'sick'|'casual'|'on_duty'} type
 * @property {string} start_date
 * @property {string} end_date
 * @property {string} reason
 * @property {'pending'|'approved'|'rejected'} status
 * @property {string | null} mentor_comment
 * @property {string | null} attachment_name
 * @property {string} submitted_at
 * @property {string | null} resolved_at
 * @property {bigint | number | null} resolved_by
 */

export {}
