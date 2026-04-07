import * as userService from '../services/user.service.js'
import { getPool, query } from '../config/database.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function analytics(req, res, next) {
  try {
    const pool = getPool()
    const [statusRows, typeRows] = await Promise.all([
      query(pool, `SELECT status, COUNT(*) AS count FROM leave_requests GROUP BY status`, {}),
      query(pool, `SELECT type, COUNT(*) AS count FROM leave_requests GROUP BY type`, {}),
    ])
    const byStatus = { pending: 0, approved: 0, rejected: 0 }
    for (const r of statusRows) {
      const s = r.status
      if (s && s in byStatus) byStatus[s] = Number(r.count) || 0
    }
    const byType = { sick: 0, casual: 0, on_duty: 0 }
    for (const r of typeRows) {
      if (r.type) byType[r.type] = Number(r.count) || 0
    }
    res.json({ success: true, data: { byStatus, byType } })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listUsers(req, res, next) {
  try {
    const rows = await userService.listUsers({ role: req.query.role })
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
export async function createUser(req, res, next) {
  try {
    const result = await userService.createUser(req.body)
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
export async function updateUser(req, res, next) {
  try {
    const result = await userService.updateUser(req.params.id, req.body)
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
export async function assignMentor(req, res, next) {
  try {
    const result = await userService.assignMentor(req.body.studentId, req.body.teacherId)
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
export async function updateBalances(req, res, next) {
  try {
    const body = req.body
    const result = await userService.updateBalances(req.params.id, {
      sick: body.sick,
      casual: body.casual,
      onDuty: body.onDuty,
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
export async function getBalances(req, res, next) {
  try {
    const data = await userService.getBalances(req.params.id)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}
