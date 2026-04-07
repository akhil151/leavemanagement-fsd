import * as leaveService from '../services/leave.service.js'
import { getPool, query } from '../config/database.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function analytics(req, res, next) {
  try {
    const pool = getPool()
    const rows = await query(
      pool,
      `SELECT lr.status, COUNT(*) AS count
       FROM leave_requests lr
       WHERE lr.mentor_id = :tid
       GROUP BY lr.status`,
      { tid: req.user.id },
    )
    const counts = { pending: 0, approved: 0, rejected: 0 }
    for (const r of rows) {
      const s = r.status
      if (s && s in counts) counts[s] = Number(r.count) || 0
    }
    res.json({ success: true, data: counts })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function leaveRequests(req, res, next) {
  try {
    const rows = await leaveService.getTeacherLeaveRequests(req.user.id, {
      status: req.query.status,
    })
    res.json({ success: true, data: rows })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function approveLeave(req, res, next) {
  try {
    const result = await leaveService.approveLeave({
      requestId: req.body.requestId,
      teacherId: req.user.id,
      comment: req.body.comment,
    })
    res.json({ success: true, data: result })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function rejectLeave(req, res, next) {
  try {
    const result = await leaveService.rejectLeave({
      requestId: req.body.requestId,
      teacherId: req.user.id,
      comment: req.body.comment,
    })
    res.json({ success: true, data: result })
  } catch (e) {
    next(e)
  }
}
