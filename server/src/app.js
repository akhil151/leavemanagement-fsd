import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import studentRoutes from './routes/student.routes.js'
import teacherRoutes from './routes/teacher.routes.js'
import adminRoutes from './routes/admin.routes.js'
import leaveRoutes from './routes/leave.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js'
import { createRouteRateLimiter, sanitizeInput } from './middleware/security.middleware.js'

const app = express()

const corsOrigins =
  env.corsOrigin === '*'
    ? true
    : env.corsOrigin.split(',').map((s) => s.trim())

app.use(helmet())
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(sanitizeInput)

const globalLimiter = createRouteRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxProd: 300,
  maxDev: 2000,
  message: 'Too many requests from this client',
})

const authLimiter = createRouteRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxProd: 20,
  maxDev: 120,
  message: 'Too many login attempts. Please try again later.',
})

const leaveLimiter = createRouteRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxProd: 120,
  maxDev: 600,
  message: 'Too many leave requests. Please slow down.',
})

app.use(globalLimiter)

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'leavemanage-api', env: env.nodeEnv })
})

app.use('/', authLimiter, authRoutes)
app.use('/student', studentRoutes)
app.use('/teacher', teacherRoutes)
app.use('/admin', adminRoutes)
app.use('/leave', leaveLimiter, leaveRoutes)
app.use('/notifications', notificationsRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
