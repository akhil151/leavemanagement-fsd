import * as authService from '../services/auth.service.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body)
    res.json({ success: true, data: result })
  } catch (e) {
    next(e)
  }
}
