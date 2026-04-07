import bcrypt from 'bcryptjs'
import { log } from '../utils/logger.js'

const DEFAULT_ADMIN_EMAIL = 'admin@college.com'
const DEFAULT_ADMIN_PASSWORD = 'admin123'
const DEFAULT_ADMIN_NAME = 'System Administrator'

/**
 * If no user with role admin exists, inserts the default admin (idempotent).
 * @param {import('mysql2/promise').Pool} pool
 */
export async function ensureDefaultAdmin(pool) {
  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`,
  )
  const adminCount = Number(countRow?.c ?? 0)
  if (adminCount > 0) {
    return { created: false, reason: 'admin_exists' }
  }

  const [byEmail] = await pool.query(`SELECT id, role FROM users WHERE email = :e LIMIT 1`, {
    e: DEFAULT_ADMIN_EMAIL,
  })
  if (byEmail.length) {
    log.warn('default_admin.email_collision', {
      email: DEFAULT_ADMIN_EMAIL,
      message: 'User with default admin email exists but no admin role; not auto-creating',
    })
    return { created: false, reason: 'email_taken_non_admin' }
  }

  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12)
  await pool.query(
    `INSERT INTO users (email, password_hash, role, name, student_code, department, parent_email, mentor_id)
     VALUES (:email, :hash, 'admin', :name, NULL, NULL, NULL, NULL)`,
    {
      email: DEFAULT_ADMIN_EMAIL,
      hash,
      name: DEFAULT_ADMIN_NAME,
    },
  )

  log.info('default_admin.created', { email: DEFAULT_ADMIN_EMAIL })
  return { created: true, email: DEFAULT_ADMIN_EMAIL }
}
