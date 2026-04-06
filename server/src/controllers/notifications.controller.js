import * as notificationsService from '../services/notifications.service.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listNotifications(req, res, next) {
  try {
    const rows = await notificationsService.getNotifications({
      userId: req.user.id,
      priority: req.query.priority,
      unreadOnly: req.query.unreadOnly,
      limit: req.query.limit,
    })
    res.json({ success: true, data: rows })
  } catch (e) {
    next(e)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function markRead(req, res, next) {
  try {
    const result = await notificationsService.markNotificationsRead({
      userId: req.user.id,
      ids: req.body.ids,
      markAll: req.body.markAll,
    })
    res.json({ success: true, data: result })
  } catch (e) {
    next(e)
  }
}

