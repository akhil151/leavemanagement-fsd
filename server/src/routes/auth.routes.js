import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { loginSchema, registerSchema } from '../validators/schemas.js'

const r = Router()

r.post('/login', validate(loginSchema), authController.login)
r.post('/register', validate(registerSchema), authController.register)

export default r
