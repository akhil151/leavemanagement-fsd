import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'keerthiga@98356',
  database: 'leavemanage',
  namedPlaceholders: true,
})

const [lr] = await pool.query('SELECT id, student_id, mentor_id, status FROM leave_requests')
console.log('LEAVE_REQUESTS:', JSON.stringify(lr, null, 2))

const [st] = await pool.query("SELECT id, name, mentor_id FROM users WHERE role='student'")
console.log('STUDENTS:', JSON.stringify(st, null, 2))

const [tc] = await pool.query("SELECT id, name FROM users WHERE role='teacher'")
console.log('TEACHERS:', JSON.stringify(tc, null, 2))

await pool.end()
