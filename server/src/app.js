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
import { getDbHealthStatus, getPool } from './config/database.js'
import { log } from './utils/logger.js'

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

app.use((req, res, next) => {
  const startedAt = Date.now()
  const requestId =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) ||
    `req_${startedAt}_${Math.random().toString(16).slice(2)}`

  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    const ms = Date.now() - startedAt
    log.info('api.request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms,
      ip: req.ip,
      ua: req.headers['user-agent'],
    })
  })

  next()
})

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

app.get('/health', async (req, res) => {
  try {
    const pool = getPool()
    await pool.query('SELECT 1')
    const [[{ tableCount }]] = await pool.query(
      `SELECT COUNT(*) AS tableCount
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN (
           'users',
           'students',
           'teachers',
           'leave_requests',
           'leave_balances',
           'notifications',
           'audit_logs',
           'notification_log'
         )`,
    )
    const dbStatus = getDbHealthStatus()
    const tablesOk = Number(tableCount) === 8 && dbStatus.tablesVerified
    res.json({
      ok: true,
      server: 'ok',
      database: 'connected',
      tables: tablesOk ? 'verified' : 'unverified',
    })
  } catch (e) {
    log.error('db.healthcheck_failed', {
      requestId: res.getHeader('x-request-id'),
      error: e instanceof Error ? e.message : String(e),
    })
    res.status(200).json({
      ok: true,
      server: 'ok',
      database: 'disconnected',
      tables: 'unverified',
    })
  }
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
