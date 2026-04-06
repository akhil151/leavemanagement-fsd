import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  adminUsersQuerySchema,
  assignMentorSchema,
  createUserSchema,
  userIdParamSchema,
  updateBalancesSchema,
  updateUserSchema,
} from '../validators/schemas.js'

const r = Router()

r.use(authenticate, requireRoles('admin'))

r.get('/users', validate(adminUsersQuerySchema, 'query'), adminController.listUsers)
r.post('/users', validate(createUserSchema), adminController.createUser)
r.patch('/users/:id', validate(userIdParamSchema, 'params'), validate(updateUserSchema), adminController.updateUser)
r.post('/assign-mentor', validate(assignMentorSchema), adminController.assignMentor)
r.patch(
  '/users/:id/balances',
  validate(userIdParamSchema, 'params'),
  validate(updateBalancesSchema),
  adminController.updateBalances,
)
r.get('/users/:id/balances', validate(userIdParamSchema, 'params'), adminController.getBalances)

export default r
