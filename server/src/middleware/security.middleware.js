import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

/**
 * Light input sanitization to reduce abuse surface while preserving normal payloads.
 * @param {unknown} value
 * @returns {unknown}
 */
function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(/** @type {Record<string, unknown>} */ (value)).map(([k, v]) => [k, sanitizeValue(v)]),
    )
  }
  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '').trim()
  }
  return value
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    Object.assign(req.body, sanitizeValue(req.body))
  }
  if (req.query && typeof req.query === 'object') {
    const sanitized = /** @type {Record<string, unknown>} */ (sanitizeValue(req.query))
    for (const key of Object.keys(req.query)) {
      if (!(key in sanitized)) delete req.query[key]
    }
    Object.assign(req.query, sanitized)
  }
  if (req.params && typeof req.params === 'object') {
    Object.assign(req.params, sanitizeValue(req.params))
  }
  next()
}

/**
 * @param {{ windowMs: number; maxProd: number; maxDev?: number; message: string }} cfg
 */
export function createRouteRateLimiter(cfg) {
  return rateLimit({
    windowMs: cfg.windowMs,
    max: env.nodeEnv === 'production' ? cfg.maxProd : (cfg.maxDev ?? cfg.maxProd * 5),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: cfg.message },
    },
  })
}
