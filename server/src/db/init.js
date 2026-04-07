import mysql from 'mysql2/promise'
import { env } from '../config/env.js'
import { ensureTables } from './schema.js'
import { log } from '../utils/logger.js'

const MAX_RETRIES = 5

/**
 * @param {number} ms
 */
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {number} attempt
 */
function retryDelayMs(attempt) {
  return Math.min(8000, 400 * 2 ** (attempt - 1))
}

/**
 * @param {() => Promise<void>} task
 * @param {string} label
 */
async function withRetry(task, label) {
  let lastError = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await task()
      if (attempt > 1) {
        log.info('db.retry_recovered', { label, attempt })
      }
      return
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      log.error('db.retry_failed', { label, attempt, message })
      if (attempt < MAX_RETRIES) {
        await sleep(retryDelayMs(attempt))
      }
    }
  }
  throw lastError ?? new Error(`${label} failed`)
}

/**
 * @param {string} dbName
 */
function escapeDbIdentifier(dbName) {
  return `\`${dbName.replaceAll('`', '``')}\``
}

/**
 * Initializes the database and schema in a non-destructive way.
 * It first connects without DB_NAME to create the database if needed,
 * then reconnects with DB_NAME and ensures required tables exist.
 *
 * @returns {Promise<import('mysql2/promise').Pool>}
 */
export async function initializeDatabase() {
  const sslOpts = env.db.ssl ? { rejectUnauthorized: false } : undefined

  const basePool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    waitForConnections: true,
    connectionLimit: Math.max(2, Math.min(env.db.connectionLimit, 5)),
    ...(sslOpts && { ssl: sslOpts }),
  })

  await withRetry(async () => {
    await basePool.query(`CREATE DATABASE IF NOT EXISTS ${escapeDbIdentifier(env.db.database)}`)
    log.info('db.created_or_exists', { database: env.db.database })
  }, 'create_database')

  await basePool.end()

  const appPool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    waitForConnections: true,
    connectionLimit: env.db.connectionLimit,
    namedPlaceholders: true,
    dateStrings: true,
    ...(sslOpts && { ssl: sslOpts }),
  })

  await withRetry(async () => {
    await appPool.query('SELECT 1')
    log.info('db.connected', { database: env.db.database })
  }, 'connect_database')

  await withRetry(async () => {
    await ensureTables(appPool)
    log.info('db.tables_verified')
  }, 'ensure_tables')

  await withRetry(async () => {
    const [result] = await appPool.query(
      `UPDATE leave_requests lr
       INNER JOIN users u ON u.id = lr.student_id
       SET lr.mentor_id = u.mentor_id
       WHERE lr.mentor_id IS NULL AND u.mentor_id IS NOT NULL`,
    )
    const affected = /** @type {import('mysql2').ResultSetHeader} */ (result).affectedRows ?? 0
    if (affected) log.info('db.backfill_leave_mentor_id', { rows: affected })
  }, 'backfill_leave_mentor_id')

  return appPool
}
