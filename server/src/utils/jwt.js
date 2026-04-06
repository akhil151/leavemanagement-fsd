import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * @param {{ sub: string; role: string; email: string }} payload
 */
export function signToken(payload) {
  return jwt.sign(
    { sub: payload.sub, role: payload.role, email: payload.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  )
}

/**
 * @param {string} token
 */
export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret)
}
