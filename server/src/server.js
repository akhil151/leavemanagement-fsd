import { createServer } from 'node:http'
import app from './app.js'
import { env } from './config/env.js'
import { getPool } from './config/database.js'
import { attachSocket } from './socket/socket.js'
import { initRealtime } from './services/realtime.service.js'

getPool()

const httpServer = createServer(app)
const io = attachSocket(httpServer)
initRealtime(io)

httpServer.listen(env.port, () => {
  console.log(`leavemanage-api listening on :${env.port} (${env.nodeEnv})`)
  console.log('Socket.io attached (JWT auth on handshake)')
})
