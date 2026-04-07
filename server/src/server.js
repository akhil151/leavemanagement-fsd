import { createServer } from 'node:http'
import app from './app.js'
import { env } from './config/env.js'
import { getPool, setPool, setTablesVerified } from './config/database.js'
import { attachSocket } from './socket/socket.js'
import { initRealtime } from './services/realtime.service.js'
import { log } from './utils/logger.js'
import { initializeDatabase } from './db/init.js'
import { ensureDefaultAdmin } from './services/defaultAdmin.service.js'

process.on('unhandledRejection', (reason) => {
  log.error('process.unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  })
})

process.on('uncaughtException', (err) => {
  log.error('process.uncaughtException', {
    name: err?.name ?? 'Error',
    message: err?.message ?? String(err),
  })
  // In production, fail fast to avoid serving in a bad state.
  if (env.nodeEnv === 'production') process.exit(1)
})

async function start() {
  try {
    const dbPool = await initializeDatabase()
    setPool(dbPool)
    setTablesVerified(true)
    await ensureDefaultAdmin(getPool())
  } catch (e) {
    log.error('db.initialization_failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    setTablesVerified(false)
    if (env.nodeEnv === 'production') {
      log.error('db.unavailable_fatal', { env: env.nodeEnv })
      process.exit(1)
    }
  }

  const httpServer = createServer(app)
  const io = attachSocket(httpServer)
  initRealtime(io)

  httpServer.listen(env.port, () => {
    log.info('server.listening', { port: env.port, env: env.nodeEnv })
    log.info('socket.attached', { auth: 'jwt_handshake' })
  })
}

start()
