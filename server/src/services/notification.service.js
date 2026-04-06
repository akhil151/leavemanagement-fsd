import { query } from '../config/database.js'
import { sendMail } from './email.service.js'
import { buildLeaveDecisionEmail, buildLeaveSubmittedEmail } from '../lib/leaveEmailTemplates.js'

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{ userId: string; title: string; body: string; priority?: 'info'|'warning'|'critical'; type?: string }} input
 */
export async function createInAppNotification(conn, input) {
  const type = input.type ?? 'leave'
  const priority = input.priority ?? 'info'

  // Backward compatibility: older DB schema may not have `type` / `priority` columns.
  try {
    await query(
      conn,
      `INSERT INTO notifications (user_id, title, body, type, priority, is_read)
       VALUES (:userId, :title, :body, :type, :priority, 0)`,
      {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type,
        priority,
      },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('Unknown column') && !msg.includes('type') && !msg.includes('priority')) {
      throw e
    }
    await query(
      conn,
      `INSERT INTO notifications (user_id, title, body, is_read)
       VALUES (:userId, :title, :body, 0)`,
      {
        userId: input.userId,
        title: input.title,
        body: input.body,
      },
    )
  }
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{ leaveRequestId: string; channel: 'email' | 'in_app'; target: string; status: 'sent' | 'failed' | 'skipped'; detail?: string }} row
 */
export async function logNotification(conn, row) {
  await query(
    conn,
    `INSERT INTO notification_log (leave_request_id, channel, target, status, detail)
     VALUES (:leaveRequestId, :channel, :target, :status, :detail)`,
    {
      leaveRequestId: row.leaveRequestId,
      channel: row.channel,
      target: row.target,
      status: row.status,
      detail: row.detail ?? null,
    },
  )
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{ to: string; subject: string; text: string; html: string; leaveRequestId: string }} mail
 */
async function sendAndLog(conn, mail) {
  try {
    const result = await sendMail({
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    })
    await logNotification(conn, {
      leaveRequestId: mail.leaveRequestId,
      channel: 'email',
      target: mail.to,
      status: result.skipped ? 'skipped' : 'sent',
      detail: result.skipped ? String(result.reason) : undefined,
    })
  } catch (e) {
    await logNotification(conn, {
      leaveRequestId: mail.leaveRequestId,
      channel: 'email',
      target: mail.to,
      status: 'failed',
      detail: e instanceof Error ? e.message : 'send failed',
    })
  }
}

/**
 * Student applied: in-app to mentor + email to mentor & parent (structured body).
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{
 *   leaveRequestId: string
 *   studentName: string
 *   leaveType: string
 *   startDate: string
 *   endDate: string
 *   reason: string
 *   mentorUserId: string | null
 *   mentorEmail: string | null
 *   parentEmail: string | null
 * }} ctx
 */
export async function notifyLeaveSubmitted(conn, ctx) {
  const summary = `Type: ${ctx.leaveType}, Dates: ${ctx.startDate} to ${ctx.endDate}.`

  if (ctx.mentorUserId) {
    await createInAppNotification(conn, {
      userId: ctx.mentorUserId,
      title: 'New leave request',
      body: `${ctx.studentName} submitted a leave request. ${summary}`,
      priority: 'info',
      type: 'leave_applied',
    })
    await logNotification(conn, {
      leaveRequestId: ctx.leaveRequestId,
      channel: 'in_app',
      target: `user:${ctx.mentorUserId}`,
      status: 'sent',
      detail: 'Mentor in-app notification created',
    })
  } else {
    await logNotification(conn, {
      leaveRequestId: ctx.leaveRequestId,
      channel: 'in_app',
      target: 'mentor',
      status: 'skipped',
      detail: 'No mentor assigned',
    })
  }

  if (ctx.mentorEmail) {
    const m = buildLeaveSubmittedEmail({
      studentName: ctx.studentName,
      leaveType: ctx.leaveType,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      reason: ctx.reason,
      audience: 'mentor',
    })
    await sendAndLog(conn, {
      to: ctx.mentorEmail,
      subject: m.subject,
      text: m.text,
      html: m.html,
      leaveRequestId: ctx.leaveRequestId,
    })
  } else {
    await logNotification(conn, {
      leaveRequestId: ctx.leaveRequestId,
      channel: 'email',
      target: 'mentor',
      status: 'skipped',
      detail: 'No mentor email',
    })
  }

  if (ctx.parentEmail) {
    const p = buildLeaveSubmittedEmail({
      studentName: ctx.studentName,
      leaveType: ctx.leaveType,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      reason: ctx.reason,
      audience: 'parent',
    })
    await sendAndLog(conn, {
      to: ctx.parentEmail,
      subject: p.subject,
      text: p.text,
      html: p.html,
      leaveRequestId: ctx.leaveRequestId,
    })
  } else {
    await logNotification(conn, {
      leaveRequestId: ctx.leaveRequestId,
      channel: 'email',
      target: 'parent',
      status: 'skipped',
      detail: 'No parent email on file',
    })
  }
}

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{
 *   leaveRequestId: string
 *   studentUserId: string
 *   studentName: string
 *   leaveType: string
 *   startDate: string
 *   endDate: string
 *   reason: string
 *   parentEmail: string | null
 *   decision: 'approved' | 'rejected'
 *   mentorComment?: string | null
 * }} input
 */
export async function notifyLeaveResolved(conn, input) {
  await createInAppNotification(conn, {
    userId: input.studentUserId,
    title: input.decision === 'approved' ? 'Leave approved' : 'Leave rejected',
    body:
      input.decision === 'approved'
        ? `Your ${input.leaveType} leave was approved.${input.mentorComment ? ` Note: ${input.mentorComment}` : ''}`
        : `Your ${input.leaveType} leave was rejected.${input.mentorComment ? ` Reason: ${input.mentorComment}` : ''}`,
    priority: input.decision === 'approved' ? 'info' : 'warning',
    type: 'leave_updated',
  })
  await logNotification(conn, {
    leaveRequestId: input.leaveRequestId,
    channel: 'in_app',
    target: `user:${input.studentUserId}`,
    status: 'sent',
    detail: 'Student notified of decision',
  })

  if (input.parentEmail) {
    const d = buildLeaveDecisionEmail({
      studentName: input.studentName,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      decision: input.decision,
      comment: input.mentorComment ?? null,
    })
    await sendAndLog(conn, {
      to: input.parentEmail,
      subject: d.subject,
      text: d.text,
      html: d.html,
      leaveRequestId: input.leaveRequestId,
    })
  } else {
    await logNotification(conn, {
      leaveRequestId: input.leaveRequestId,
      channel: 'email',
      target: 'parent',
      status: 'skipped',
      detail: 'No parent email for decision notice',
    })
  }
}
