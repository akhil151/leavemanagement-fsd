import * as leaveService from '../services/leave.service.js'

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
