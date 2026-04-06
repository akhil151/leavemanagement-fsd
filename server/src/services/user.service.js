import bcrypt from 'bcryptjs'
import { getPool, query } from '../config/database.js'
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js'

/**
 * @param {{ role?: 'student'|'teacher'|'admin' }} [filter]
 */
export async function listUsers(filter = {}) {
  const pool = getPool()
  let sql = `
    SELECT u.id, u.email, u.role, u.name, u.student_code AS studentCode, u.department,
           u.parent_email AS parentEmail, u.mentor_id AS mentorId,
           m.name AS mentorName
    FROM users u
    LEFT JOIN users m ON m.id = u.mentor_id
    WHERE 1=1
  `
  const params = /** @type {Record<string, string>} */ ({})
  if (filter.role) {
    sql += ` AND u.role = :role `
    params.role = filter.role
  }
  sql += ` ORDER BY u.role, u.name`
  return query(pool, sql, params)
}

/**
 * @param {{
 *   email: string
 *   password: string
 *   role: 'student'|'teacher'|'admin'
 *   name: string
 *   studentCode?: string | null
 *   department?: string | null
 *   parentEmail?: string | null
 *   mentorId?: string | null
 * }} input
 */
export async function createUser(input) {
  const pool = getPool()
  const email = input.email.trim().toLowerCase()
  const hash = await bcrypt.hash(input.password, 12)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [existing] = await conn.query(`SELECT id FROM users WHERE email = :e LIMIT 1`, {
      e: email,
    })
    if (existing.length) {
      throw new ConflictError('Email already registered')
    }

    if (input.role === 'student' && input.mentorId) {
      const [m] = await conn.query(`SELECT id, role FROM users WHERE id = :id`, { id: input.mentorId })
      const mentor = m[0]
      if (!mentor || mentor.role !== 'teacher') {
        throw new ValidationError('Mentor must be a teacher user')
      }
    }

    const [ins] = await conn.query(
      `INSERT INTO users (email, password_hash, role, name, student_code, department, parent_email, mentor_id)
       VALUES (:email, :hash, :role, :name, :sc, :dept, :pe, :mid)`,
      {
        email,
        hash,
        role: input.role,
        name: input.name,
        sc: input.studentCode ?? null,
        dept: input.department ?? null,
        pe: input.parentEmail ?? null,
        mid: input.role === 'student' ? input.mentorId ?? null : null,
      },
    )

    const id = String(/** @type {{ insertId: number }} */ (ins).insertId)

    if (input.role === 'student') {
      await conn.query(
        `INSERT INTO leave_balances (user_id, sick, casual, on_duty) VALUES (:id, 10, 8, 5)`,
        { id },
      )
    }

    await conn.commit()
    return { id, email, role: input.role }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

/**
 * @param {string} userId
 * @param {{ parentEmail?: string | null; department?: string | null; name?: string }} patch
 */
export async function updateUser(userId, patch) {
  const pool = getPool()
  const fields = []
  const params = { id: userId }

  if (patch.name !== undefined) {
    fields.push('name = :name')
    params.name = patch.name
  }
  if (patch.department !== undefined) {
    fields.push('department = :dept')
    params.dept = patch.department
  }
  if (patch.parentEmail !== undefined) {
    fields.push('parent_email = :pe')
    params.pe = patch.parentEmail
  }

  if (!fields.length) return { updated: false }

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = :id`
  const [r] = await pool.query(sql, params)
  const affected = /** @type {{ affectedRows: number }} */ (r).affectedRows
  if (!affected) throw new NotFoundError('User not found')
  return { updated: true }
}

/**
 * @param {string} studentId
 * @param {string} teacherId
 */
export async function assignMentor(studentId, teacherId) {
  const pool = getPool()
  const conn = await pool.getConnection()
  try {
    const [sRows] = await conn.query(`SELECT id, role FROM users WHERE id = :id`, { id: studentId })
    const s = sRows[0]
    if (!s || s.role !== 'student') throw new ValidationError('Target user must be a student')

    const [tRows] = await conn.query(`SELECT id, role FROM users WHERE id = :id`, { id: teacherId })
    const t = tRows[0]
    if (!t || t.role !== 'teacher') throw new ValidationError('Mentor must be a teacher')

    await conn.query(`UPDATE users SET mentor_id = :tid WHERE id = :sid`, {
      tid: teacherId,
      sid: studentId,
    })

    await conn.query(
      `UPDATE leave_requests SET mentor_id = :tid WHERE student_id = :sid AND status = 'pending'`,
      { tid: teacherId, sid: studentId },
    )

    return { studentId, mentorId: teacherId }
  } finally {
    conn.release()
  }
}

/**
 * @param {string} studentId
 * @param {{ sick?: number; casual?: number; onDuty?: number }} balances
 */
export async function updateBalances(studentId, balances) {
  const pool = getPool()
  const [u] = await pool.query(`SELECT id, role FROM users WHERE id = :id`, { id: studentId })
  const user = u[0]
  if (!user || user.role !== 'student') throw new ValidationError('User must be a student')

  const fields = []
  const params = { id: studentId }
  if (balances.sick !== undefined) {
    fields.push('sick = :sick')
    params.sick = balances.sick
  }
  if (balances.casual !== undefined) {
    fields.push('casual = :casual')
    params.casual = balances.casual
  }
  if (balances.onDuty !== undefined) {
    fields.push('on_duty = :od')
    params.od = balances.onDuty
  }
  if (!fields.length) return { updated: false }

  const sql = `UPDATE leave_balances SET ${fields.join(', ')} WHERE user_id = :id`
  const [r] = await pool.query(sql, params)
  const affected = /** @type {{ affectedRows: number }} */ (r).affectedRows
  if (!affected) throw new NotFoundError('Balance row not found')
  return { updated: true }
}

/**
 * @param {string} studentId
 */
export async function getBalances(studentId) {
  const pool = getPool()
  const rows = await query(
    pool,
    `SELECT sick, casual, on_duty AS onDuty FROM leave_balances WHERE user_id = :id`,
    { id: studentId },
  )
  const b = rows[0]
  if (!b) throw new NotFoundError('Balances not found')
  return b
}
