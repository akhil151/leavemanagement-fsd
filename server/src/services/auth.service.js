import bcrypt from 'bcryptjs'
import { getPool, query } from '../config/database.js'
import { signToken } from '../utils/jwt.js'
import { UnauthorizedError } from '../utils/errors.js'

/**
 * @param {{ email: string; password: string }} input
 */
export async function login(input) {
  const pool = getPool()
  const rows = await query(
    pool,
    `SELECT id, email, password_hash, role, name, student_code, department, parent_email, mentor_id
     FROM users WHERE email = :email LIMIT 1`,
    { email: input.email.trim().toLowerCase() },
  )

  const user = /** @type {import('../types.js').UserRow | undefined} */ (rows[0])
  if (!user) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const ok = await bcrypt.compare(input.password, user.password_hash)
  if (!ok) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const token = signToken({
    sub: String(user.id),
    role: user.role,
    email: user.email,
  })

  return {
    token,
    user: {
      id: String(user.id),
      email: user.email,
      role: user.role,
      name: user.name,
      studentCode: user.student_code,
      department: user.department,
      mentorId: user.mentor_id ? String(user.mentor_id) : null,
    },
  }
}
