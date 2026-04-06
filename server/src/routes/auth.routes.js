import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { loginSchema } from '../validators/schemas.js'

const r = Router()

r.post('/login', validate(loginSchema), authController.login)

export default r
