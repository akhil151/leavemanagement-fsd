import { Server } from 'socket.io'
import { verifyToken } from '../utils/jwt.js'
import { env } from '../config/env.js'

/**
 * @param {import('http').Server} httpServer
 */
export function attachSocket(httpServer) {
  const origins =
    env.corsOrigin === '*'
      ? '*'
      : env.corsOrigin.split(',').map((s) => s.trim())

  const io = new Server(httpServer, {
    cors: {
      origin: origins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  })

  io.use((socket, next) => {
    const raw =
      socket.handshake.auth?.token ??
      socket.handshake.query?.token ??
      (typeof socket.handshake.headers.authorization === 'string' &&
      socket.handshake.headers.authorization.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : null)

    if (!raw) {
      return next(new Error('auth required'))
    }
    try {
      const d = verifyToken(String(raw))
      socket.data.userId = String(d.sub)
      socket.data.role = d.role
      socket.data.email = d.email
      return next()
    } catch {
      return next(new Error('auth required'))
    }
  })

  io.on('connection', (socket) => {
    const uid = socket.data.userId
    socket.join(`user:${uid}`)
    socket.emit('socket:ready', { userId: uid })
  })

  return io
}
