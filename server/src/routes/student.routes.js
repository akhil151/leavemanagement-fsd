import { Router } from 'express'
import * as studentController from '../controllers/student.controller.js'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { applyLeaveSchema } from '../validators/schemas.js'

const r = Router()

r.use(authenticate, requireRoles('student'))

r.get('/dashboard', studentController.dashboard)
r.post('/apply-leave', validate(applyLeaveSchema), studentController.applyLeave)
r.get('/my-leaves', studentController.myLeaves)

export default r
