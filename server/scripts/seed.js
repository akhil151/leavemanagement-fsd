/**
 * Seed demo users (run after importing db/schema.sql).
 * Usage: node scripts/seed.js
 */
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'leavemanage',
  })

  const hash = await bcrypt.hash('Password123!', 12)

  await conn.query('SET FOREIGN_KEY_CHECKS = 0')
  await conn.query('TRUNCATE TABLE notification_log')
  await conn.query('TRUNCATE TABLE notifications')
  await conn.query('TRUNCATE TABLE leave_requests')
  await conn.query('TRUNCATE TABLE leave_balances')
  await conn.query('TRUNCATE TABLE users')
  await conn.query('SET FOREIGN_KEY_CHECKS = 1')

  const [t1] = await conn.query(
    `INSERT INTO users (email, password_hash, role, name, department)
     VALUES ('kavitha.nair@college.edu', ?, 'teacher', 'Dr. Kavitha Nair', 'Computer Science')`,
    [hash],
  )
  const teacher1Id = /** @type {import('mysql2').ResultSetHeader} */ (t1).insertId

  const [t2] = await conn.query(
    `INSERT INTO users (email, password_hash, role, name, department)
     VALUES ('daniel.joseph@college.edu', ?, 'teacher', 'Prof. Daniel Joseph', 'Mechanical')`,
    [hash],
  )
  const teacher2Id = /** @type {import('mysql2').ResultSetHeader} */ (t2).insertId

  const [s1] = await conn.query(
    `INSERT INTO users (email, password_hash, role, name, student_code, department, parent_email, mentor_id)
     VALUES ('ananya.krishnan@college.edu', ?, 'student', 'Ananya Krishnan', 'CS24-1042', 'Computer Science', 'parent.ananya@example.com', ?)`,
    [hash, teacher1Id],
  )
  const student1Id = /** @type {import('mysql2').ResultSetHeader} */ (s1).insertId

  const [s2] = await conn.query(
    `INSERT INTO users (email, password_hash, role, name, student_code, department, parent_email, mentor_id)
     VALUES ('rahul.mehta@college.edu', ?, 'student', 'Rahul Mehta', 'ME23-0891', 'Mechanical', 'parent.rahul@example.com', ?)`,
    [hash, teacher2Id],
  )
  const student2Id = /** @type {import('mysql2').ResultSetHeader} */ (s2).insertId

  const [s3] = await conn.query(
    `INSERT INTO users (email, password_hash, role, name, student_code, department, parent_email, mentor_id)
     VALUES ('priya.sharma@college.edu', ?, 'student', 'Priya Sharma', 'EE24-0510', 'Electrical', NULL, ?)`,
    [hash, teacher1Id],
  )
  const student3Id = /** @type {import('mysql2').ResultSetHeader} */ (s3).insertId

  await conn.query(
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ('admin@college.edu', ?, 'admin', 'Registrar Office')`,
    [hash],
  )

  await conn.query(
    `INSERT INTO leave_balances (user_id, sick, casual, on_duty) VALUES
     (?, 8, 6, 4),
     (?, 10, 5, 3),
     (?, 7, 7, 5)`,
    [student1Id, student2Id, student3Id],
  )

  await conn.end()
  console.log('Seed complete. Password for all demo accounts: Password123!')
  console.log(
    'Student: ananya.krishnan@college.edu | Teacher: kavitha.nair@college.edu | Admin: admin@college.edu',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
