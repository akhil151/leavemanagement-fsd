import { verifyToken } from '../utils/jwt.js'
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing Bearer token')
    }
    const token = header.slice(7)
    const decoded = /** @type {{ sub: string; role: string; email: string; iat: number; exp: number }} */ (
      verifyToken(token)
    )
    req.user = {
      id: String(decoded.sub),
      role: decoded.role,
      email: decoded.email,
    }
    next()
  } catch {
    next(new UnauthorizedError('Invalid or expired token'))
  }
}

/**
 * @param  {...('student' | 'teacher' | 'admin')} roles
 */
export function requireRoles(...roles) {
  return verifyRole(roles)
}

/**
 * @param {('student' | 'teacher' | 'admin')[]} roles
 */
export function verifyRole(roles) {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError())
    if (!roles.includes(/** @type {typeof roles[number]} */ (req.user.role))) {
      return next(new ForbiddenError('Insufficient permissions'))
    }
    next()
  }
}
