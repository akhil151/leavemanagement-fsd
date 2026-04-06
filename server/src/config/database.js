import mysql from 'mysql2/promise'
import { env } from './env.js'

/** @type {mysql.Pool | null} */
let pool = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: env.db.connectionLimit,
      namedPlaceholders: true,
      dateStrings: true,
    })
  }
  return pool
}

/**
 * @template T
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} conn
 * @param {string} sql
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<T>}
 */
export async function query(conn, sql, params) {
  const [rows] = await conn.query(sql, params)
  return /** @type {T} */ (rows)
}
