import { query } from '../config/database.js'

/**
 * @typedef {'APPLY'|'APPROVE'|'REJECT'|'CANCEL'} AuditActionType
 */

/**
 * @param {import('mysql2/promise').PoolConnection | import('mysql2/promise').Pool} conn
 * @param {{
 *   actionType: AuditActionType
 *   performedBy: string
 *   targetLeaveId: string
 * }} input
 */
export async function logAuditAction(conn, input) {
  await query(
    conn,
    `INSERT INTO audit_logs (action_type, performed_by, target_leave_id)
     VALUES (:actionType, :performedBy, :targetLeaveId)`,
    {
      actionType: input.actionType,
      performedBy: input.performedBy,
      targetLeaveId: input.targetLeaveId,
    },
  )
}

/**
 * @param {import('mysql2/promise').PoolConnection | import('mysql2/promise').Pool} conn
 * @param {string} leaveId
 */
export async function getAuditHistoryByLeaveId(conn, leaveId) {
  return query(
    conn,
    `SELECT id,
            action_type AS actionType,
            performed_by AS performedBy,
            target_leave_id AS targetLeaveId,
            timestamp
     FROM audit_logs
     WHERE target_leave_id = :leaveId
     ORDER BY timestamp ASC, id ASC`,
    { leaveId },
  )
}

