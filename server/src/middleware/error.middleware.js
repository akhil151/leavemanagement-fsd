import { AppError } from '../utils/errors.js'

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
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code ?? 'APP_ERROR', message: err.message },
    })
  }

  // JWT errors from jsonwebtoken
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    })
  }

  console.error(err)
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  })
}
