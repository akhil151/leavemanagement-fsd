import * as leaveService from '../services/leave.service.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function dashboard(req, res, next) {
  try {
    const data = await leaveService.getStudentDashboard(req.user.id)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function applyLeave(req, res, next) {
  try {
    const result = await leaveService.applyLeave({
      studentId: req.user.id,
      type: req.body.type,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason,
      attachmentName: req.body.attachmentName ?? null,
    })
    res.status(201).json({ success: true, data: result })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function myLeaves(req, res, next) {
  try {
    const rows = await leaveService.getMyLeaves(req.user.id)
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
export async function leaveHistory(req, res, next) {
  try {
    const rows = await leaveService.getLeaveAuditHistory({
      leaveId: req.params.leaveId,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    })
    res.json({ success: true, data: rows })
  } catch (e) {
    next(e)
  }
}
