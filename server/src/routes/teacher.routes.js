import { Router } from 'express'
import * as teacherController from '../controllers/teacher.controller.js'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { leaveActionSchema, teacherFilterSchema } from '../validators/schemas.js'

const r = Router()

r.use(authenticate, requireRoles('teacher'))

r.get('/leave-requests', validate(teacherFilterSchema, 'query'), teacherController.leaveRequests)
r.post('/approve-leave', validate(leaveActionSchema), teacherController.approveLeave)
r.post('/reject-leave', validate(leaveActionSchema), teacherController.rejectLeave)

export default r
