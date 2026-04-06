import { getPool, query } from '../config/database.js'
import { inclusiveDays } from '../utils/date.js'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js'
import { notifyLeaveSubmitted, notifyLeaveResolved } from './notification.service.js'
import { emitLeaveApplied, emitLeaveUpdated } from './realtime.service.js'
import { getAuditHistoryByLeaveId, logAuditAction } from './audit.service.js'

/** @param {'sick'|'casual'|'on_duty'} type */
function balanceColumn(type) {
  if (type === 'sick') return 'sick'
  if (type === 'casual') return 'casual'
  return 'on_duty'
}

/**
 * @param {string} studentId
 */
export async function getStudentDashboard(studentId) {
  const pool = getPool()
  const [balances] = await pool.query(
    `SELECT sick, casual, on_duty FROM leave_balances WHERE user_id = :id LIMIT 1`,
    { id: studentId },
  )
  const bal = /** @type {{ sick: number; casual: number; on_duty: number } | undefined} */ (
    balances[0]
  )
  if (!bal) throw new NotFoundError('Leave balances not found')

  const recent = await query(
    pool,
    `SELECT id, type, start_date AS startDate, end_date AS endDate, status, submitted_at AS submittedAt
     FROM leave_requests WHERE student_id = :id ORDER BY submitted_at DESC LIMIT 8`,
    { id: studentId },
  )

  // Backward compatibility: older DB schema may not have `type` / `priority` columns.
  let notifications
  try {
    notifications = await query(
      pool,
      `SELECT id, title, body, type, priority, is_read AS isRead, created_at AS createdAt
       FROM notifications WHERE user_id = :id ORDER BY created_at DESC LIMIT 10`,
      { id: studentId },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('Unknown column') && !msg.includes('type') && !msg.includes('priority')) {
      throw e
    }
    notifications = await query(
      pool,
      `SELECT id, title, body, is_read AS isRead, created_at AS createdAt
       FROM notifications WHERE user_id = :id ORDER BY created_at DESC LIMIT 10`,
      { id: studentId },
    )
  }

  return {
    balances: { sick: bal.sick, casual: bal.casual, onDuty: bal.on_duty },
    recentLeaves: recent,
    notifications,
  }
}

/**
 * @param {string} studentId
 */
export async function getMyLeaves(studentId) {
  const pool = getPool()
  return query(
    pool,
    `SELECT id, type, start_date AS startDate, end_date AS endDate, reason, status,
            mentor_comment AS mentorComment, attachment_name AS attachmentName,
            submitted_at AS submittedAt, resolved_at AS resolvedAt
     FROM leave_requests WHERE student_id = :id ORDER BY submitted_at DESC`,
    { id: studentId },
  )
}

/**
 * @param {{
 *   studentId: string
 *   type: 'sick'|'casual'|'on_duty'
 *   startDate: string
 *   endDate: string
 *   reason: string
 *   attachmentName?: string | null
 * }} input
 */
export async function applyLeave(input) {
  const pool = getPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [users] = await conn.query(
      `SELECT u.id, u.name, u.mentor_id, u.parent_email, u.role, m.email AS mentor_email
       FROM users u
       LEFT JOIN users m ON m.id = u.mentor_id
       WHERE u.id = :id FOR UPDATE`,
      { id: input.studentId },
    )
    const user = /** @type {{ id: number; name: string; mentor_id: number | null; parent_email: string | null; role: string; mentor_email: string | null } | undefined} */ (
      users[0]
    )
    if (!user || user.role !== 'student') {
      throw new ForbiddenError('Only students can apply for leave')
    }

    if (input.startDate > input.endDate) {
      throw new ValidationError('End date must be on or after start date')
    }

    const days = inclusiveDays(input.startDate, input.endDate)

    const [balRows] = await conn.query(
      `SELECT sick, casual, on_duty FROM leave_balances WHERE user_id = :id FOR UPDATE`,
      { id: input.studentId },
    )
    const bal = /** @type {{ sick: number; casual: number; on_duty: number } | undefined} */ (
      balRows[0]
    )
    if (!bal) throw new NotFoundError('Leave balances not found')

    const col = balanceColumn(input.type)
    const available = bal[col]
    if (days > available) {
      throw new ConflictError(
        `Insufficient ${col.replace('_', ' ')} balance (${available} day(s) available, ${days} requested)`,
        'INSUFFICIENT_BALANCE',
      )
    }

    const [overlap] = await conn.query(
      `SELECT id FROM leave_requests
       WHERE student_id = :sid AND status IN ('pending','approved')
         AND start_date <= :end AND end_date >= :start
       LIMIT 1`,
      { sid: input.studentId, start: input.startDate, end: input.endDate },
    )
    if (overlap.length) {
      throw new ConflictError(
        'Overlapping leave already exists for these dates',
        'OVERLAPPING_LEAVE',
      )
    }

    const [insertResult] = await conn.query(
      `INSERT INTO leave_requests
        (student_id, mentor_id, type, start_date, end_date, reason, status, attachment_name)
       VALUES (:studentId, :mentorId, :type, :start, :end, :reason, 'pending', :attachment)`,
      {
        studentId: input.studentId,
        mentorId: user.mentor_id,
        type: input.type,
        start: input.startDate,
        end: input.endDate,
        reason: input.reason,
        attachment: input.attachmentName ?? null,
      },
    )

    const requestId = String(
      /** @type {import('mysql2').ResultSetHeader} */ (insertResult).insertId,
    )

    await logAuditAction(conn, {
      actionType: 'APPLY',
      performedBy: input.studentId,
      targetLeaveId: requestId,
    })

    await notifyLeaveSubmitted(conn, {
      leaveRequestId: requestId,
      studentName: user.name,
      leaveType: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      mentorUserId: user.mentor_id ? String(user.mentor_id) : null,
      mentorEmail: user.mentor_email,
      parentEmail: user.parent_email,
    })

    await conn.commit()

    emitLeaveApplied({
      requestId,
      studentId: String(user.id),
      studentName: user.name,
      leaveType: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      mentorUserId: user.mentor_id ? String(user.mentor_id) : null,
    })

    return {
      id: requestId,
      status: 'pending',
      days,
    }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

/**
 * @param {string} teacherId
 * @param {{ status?: 'pending'|'approved'|'rejected'|'all' }} [filter]
 */
export async function getTeacherLeaveRequests(teacherId, filter = {}) {
  const pool = getPool()
  const status = filter.status ?? 'all'
  let sql = `
    SELECT lr.id, lr.student_id AS studentId, u.name AS studentName, u.student_code AS studentCode,
           lr.type, lr.start_date AS startDate, lr.end_date AS endDate, lr.reason, lr.status,
           lr.mentor_comment AS mentorComment, lr.submitted_at AS submittedAt, lr.resolved_at AS resolvedAt
    FROM leave_requests lr
    INNER JOIN users u ON u.id = lr.student_id
    WHERE u.mentor_id = :tid
  `
  const params = { tid: teacherId }
  if (status !== 'all') {
    sql += ` AND lr.status = :st `
    params.st = status
  }
  sql += ` ORDER BY lr.submitted_at DESC`
  return query(pool, sql, params)
}

/**
 * @param {{ requestId: string; teacherId: string; comment?: string }} input
 */
export async function approveLeave(input) {
  return resolveLeave({ ...input, decision: 'approved' })
}

/**
 * @param {{ requestId: string; teacherId: string; comment?: string }} input
 */
export async function rejectLeave(input) {
  return resolveLeave({ ...input, decision: 'rejected' })
}

/**
 * @param {{ requestId: string; teacherId: string; comment?: string; decision: 'approved'|'rejected' }} input
 */
async function resolveLeave(input) {
  const pool = getPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query(
      `SELECT lr.id, lr.student_id, lr.mentor_id, lr.type, lr.start_date, lr.end_date, lr.status, lr.reason,
              u.name AS student_name, u.parent_email
       FROM leave_requests lr
       INNER JOIN users u ON u.id = lr.student_id
       WHERE lr.id = :id FOR UPDATE`,
      { id: input.requestId },
    )
    const row = /** @type {any} */ (rows[0])
    if (!row) throw new NotFoundError('Leave request not found')
    if (String(row.mentor_id) !== String(input.teacherId)) {
      throw new ForbiddenError('You are not the assigned mentor for this student')
    }
    if (row.status !== 'pending') {
      throw new ConflictError('Request is no longer pending', 'INVALID_STATUS')
    }

    const days = inclusiveDays(String(row.start_date), String(row.end_date))

    if (input.decision === 'approved') {
      const [balRows] = await conn.query(
        `SELECT sick, casual, on_duty FROM leave_balances WHERE user_id = :sid FOR UPDATE`,
        { sid: row.student_id },
      )
      const bal = /** @type {{ sick: number; casual: number; on_duty: number } | undefined} */ (
        balRows[0]
      )
      if (!bal) throw new NotFoundError('Leave balances not found')

      const col = balanceColumn(/** @type {'sick'|'casual'|'on_duty'} */ (row.type))
      const available = bal[col]
      if (days > available) {
        throw new ConflictError(
          'Cannot approve: student no longer has sufficient balance for this request',
          'INSUFFICIENT_BALANCE',
        )
      }

      const newVal = Math.max(0, available - days)
      await query(conn, `UPDATE leave_balances SET ${col} = :v WHERE user_id = :sid`, {
        v: newVal,
        sid: row.student_id,
      })
    }

    await query(
      conn,
      `UPDATE leave_requests
       SET status = :status, mentor_comment = :comment, resolved_at = CURRENT_TIMESTAMP, resolved_by = :tid
       WHERE id = :id`,
      {
        status: input.decision,
        comment: input.comment ?? null,
        tid: input.teacherId,
        id: input.requestId,
      },
    )

    await logAuditAction(conn, {
      actionType: input.decision === 'approved' ? 'APPROVE' : 'REJECT',
      performedBy: input.teacherId,
      targetLeaveId: input.requestId,
    })

    await notifyLeaveResolved(conn, {
      leaveRequestId: input.requestId,
      studentUserId: String(row.student_id),
      studentName: String(row.student_name),
      leaveType: String(row.type),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      reason: String(row.reason),
      parentEmail: row.parent_email ? String(row.parent_email) : null,
      decision: input.decision,
      mentorComment: input.comment ?? null,
    })

    await conn.commit()

    emitLeaveUpdated({
      requestId: input.requestId,
      studentId: String(row.student_id),
      status: input.decision,
      leaveType: String(row.type),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      mentorComment: input.comment ?? null,
    })

    return { id: input.requestId, status: input.decision }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

/**
 * @param {{ leaveId: string; requesterId: string; requesterRole: 'student'|'teacher'|'admin' }} input
 */
export async function getLeaveAuditHistory(input) {
  const pool = getPool()
  const rows = await query(
    pool,
    `SELECT id, student_id, mentor_id
     FROM leave_requests
     WHERE id = :id
     LIMIT 1`,
    { id: input.leaveId },
  )
  const leave = /** @type {{ id: string; student_id: string; mentor_id: string | null } | undefined} */ (rows[0])
  if (!leave) throw new NotFoundError('Leave request not found')

  const isAdmin = input.requesterRole === 'admin'
  const isOwner = String(leave.student_id) === String(input.requesterId)
  const isMentor = leave.mentor_id && String(leave.mentor_id) === String(input.requesterId)
  if (!isAdmin && !isOwner && !isMentor) {
    throw new ForbiddenError('Not allowed to view this leave history')
  }

  return getAuditHistoryByLeaveId(pool, input.leaveId)
}

