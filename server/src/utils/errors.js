export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {string} [code]
   */
  constructor(statusCode, message, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  /** @param {string} message @param {string} [code] */
  constructor(message, code = 'VALIDATION_ERROR') {
    super(400, message, code)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(409, message, code)
    this.name = 'ConflictError'
  }
}
