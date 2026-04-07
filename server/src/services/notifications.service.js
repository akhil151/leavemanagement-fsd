import { getPool, query } from '../config/database.js'

/**
 * @param {{
 *   userId: string
 *   priority?: 'info'|'warning'|'critical'
 *   unreadOnly?: boolean
 *   limit?: number
 * }} input
 */
export async function getNotifications(input) {
  const pool = getPool()
  const params = { uid: input.userId, lim: Math.min(Math.max(input.limit ?? 100, 1), 200) }
  let sql = `
    SELECT id,
           user_id AS userId,
           title,
           body,
           type,
           priority,
           is_read AS isRead,
           created_at AS createdAt
    FROM notifications
    WHERE user_id = :uid
  `
  if (input.priority) {
    sql += ' AND priority = :priority'
    params.priority = input.priority
  }
  if (input.unreadOnly) {
    sql += ' AND is_read = 0'
  }
  sql += ' ORDER BY created_at DESC LIMIT :lim'

  try {
    return await query(pool, sql, params)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Backward compatibility: older DB schema may not include `type` / `priority`.
    if (!msg.includes('Unknown column') && !msg.includes('type') && !msg.includes('priority')) {
      throw e
    }
    let fallbackSql = `
      SELECT id,
             user_id AS userId,
             title,
             body,
             is_read AS isRead,
             created_at AS createdAt
      FROM notifications
      WHERE user_id = :uid
    `
    if (input.unreadOnly) {
      fallbackSql += ' AND is_read = 0'
    }
    fallbackSql += ' ORDER BY created_at DESC LIMIT :lim'
    return query(pool, fallbackSql, params)
  }
}

/**
 * @param {{
 *   userId: string
 *   ids?: string[]
 *   markAll?: boolean
 * }} input
 */
export async function markNotificationsRead(input) {
  const pool = getPool()
  if (input.markAll) {
    const result = await query(
      pool,
      `UPDATE notifications
       SET is_read = 1
       WHERE user_id = :uid AND is_read = 0`,
      { uid: input.userId },
    )
    return { updated: result.affectedRows ?? 0 }
  }

  const ids = (input.ids ?? []).filter(Boolean)
  if (!ids.length) return { updated: 0 }

  const placeholders = ids.map((_, i) => `:id${i}`).join(', ')
  const params = { uid: input.userId }
  ids.forEach((id, i) => {
    params[`id${i}`] = id
  })

  const result = await query(
    pool,
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = :uid
       AND is_read = 0
       AND id IN (${placeholders})`,
    params,
  )
  return { updated: result.affectedRows ?? 0 }
}

