import { AppError } from '../utils/errors.js'
import { log } from '../utils/logger.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function notFoundHandler(_req, res, _next) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
}

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    log.warn('api.app_error', {
      requestId: res.getHeader('x-request-id'),
      code: err.code ?? 'APP_ERROR',
      statusCode: err.statusCode,
      message: err.message,
    })
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code ?? 'APP_ERROR', message: err.message },
    })
  }

  // JWT errors from jsonwebtoken
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    log.warn('auth.jwt_error', {
      requestId: res.getHeader('x-request-id'),
      name: err.name,
      message: err.message,
    })
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    })
  }

  // MySQL availability/initialization errors.
  const mysqlCode = typeof err?.code === 'string' ? err.code : ''
  if (
    mysqlCode === 'ER_BAD_DB_ERROR' ||
    mysqlCode === 'ER_NO_SUCH_TABLE' ||
    mysqlCode === 'ER_ACCESS_DENIED_ERROR'
  ) {
    log.error('db.not_initialized', {
      requestId: res.getHeader('x-request-id'),
      code: mysqlCode,
      message: err?.message,
    })
    return res.status(503).json({
      success: false,
      error: { code: 'DB_NOT_INITIALIZED', message: 'Database not initialized' },
    })
  }

  if (
    mysqlCode === 'ECONNREFUSED' ||
    mysqlCode === 'PROTOCOL_CONNECTION_LOST' ||
    mysqlCode === 'ETIMEDOUT'
  ) {
    log.error('db.connection_failed', {
      requestId: res.getHeader('x-request-id'),
      code: mysqlCode,
      message: err?.message,
    })
    return res.status(503).json({
      success: false,
      error: { code: 'DB_CONNECTION_FAILED', message: 'Connection failed' },
    })
  }

  log.error('api.unhandled_error', {
    requestId: res.getHeader('x-request-id'),
    name: err instanceof Error ? err.name : 'Error',
    message: err instanceof Error ? err.message : String(err),
  })
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  })
}
