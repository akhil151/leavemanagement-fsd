import { Router } from 'express'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import * as notificationsController from '../controllers/notifications.controller.js'
import {
  notificationsListQuerySchema,
  notificationsReadSchema,
} from '../validators/schemas.js'

const r = Router()

r.use(authenticate, requireRoles('student', 'teacher', 'admin'))

r.get('/', validate(notificationsListQuerySchema, 'query'), notificationsController.listNotifications)
r.patch('/read', validate(notificationsReadSchema), notificationsController.markRead)

export default r

