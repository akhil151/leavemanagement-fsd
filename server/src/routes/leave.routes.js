import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import {
  leaveHistoryParamsSchema,
  leavePredictionParamsSchema,
  leavePredictionQuerySchema,
} from '../validators/schemas.js'
import * as leavePredictionController from '../controllers/leavePrediction.controller.js'
import * as studentController from '../controllers/student.controller.js'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'

const r = Router()

// Model-driven approval probability for a student's leave application.
r.get(
  '/prediction/:studentId',
  authenticate,
  requireRoles('student', 'teacher', 'admin'),
  validate(leavePredictionParamsSchema, 'params'),
  validate(leavePredictionQuerySchema, 'query'),
  leavePredictionController.predictLeaveApproval,
)

r.get(
  '/history/:leaveId',
  authenticate,
  requireRoles('student', 'teacher', 'admin'),
  validate(leaveHistoryParamsSchema, 'params'),
  studentController.leaveHistory,
)

export default r

