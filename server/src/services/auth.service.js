import bcrypt from 'bcryptjs'
import { getPool, query } from '../config/database.js'
import { signToken } from '../utils/jwt.js'
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js'
import { env } from '../config/env.js'
import { createUser } from './user.service.js'

/**
 * @param {{ email: string; password: string }} input
 */
export async function login(input) {
  const pool = getPool()
  const rows = await query(
    pool,
    `SELECT u.id, u.email, u.password_hash, u.role, u.name, u.student_code, u.department, u.parent_email, u.mentor_id,
            m.name AS mentor_name
     FROM users u
     LEFT JOIN users m ON m.id = u.mentor_id
     WHERE u.email = :email LIMIT 1`,
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
      mentorName: user.role === 'student' && user.mentor_name ? String(user.mentor_name) : null,
    },
  }
}

/**
 * @param {{ name: string; email: string; password: string; role: 'student'|'teacher'|'admin' }} input
 */
export async function register(input) {
  if (input.role === 'admin' && !env.auth.allowPublicAdmin) {
    throw new ForbiddenError('Admin registration is disabled')
  }

  const created = await createUser({
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
  })

  const pool = getPool()
  const rows = await query(
    pool,
    `SELECT u.id, u.email, u.role, u.name, u.student_code, u.department, u.mentor_id,
            m.name AS mentor_name
     FROM users u
     LEFT JOIN users m ON m.id = u.mentor_id
     WHERE u.id = :id LIMIT 1`,
    { id: created.id },
  )
  const user = /** @type {import('../types.js').UserRow | undefined} */ (rows[0])

  const token = signToken({
    sub: String(created.id),
    role: created.role,
    email: created.email,
  })

  return {
    token,
    user: {
      id: String(created.id),
      email: created.email,
      role: created.role,
      name: user?.name ?? input.name,
      studentCode: user?.student_code ?? null,
      department: user?.department ?? null,
      mentorId: user?.mentor_id ? String(user.mentor_id) : null,
      mentorName:
        created.role === 'student' && user?.mentor_name ? String(user.mentor_name) : null,
    },
  }
}
