/**
 * backend/middleware/errorHandler.js
 * Centralised error handling middleware.
 *
 * All unhandled errors in route handlers propagate here via next(err).
 * Returns consistent JSON error shapes regardless of error source.
 */

'use strict';

const config = require('../../config/config');

/** Map common error names to HTTP status codes */
const STATUS_MAP = {
  ValidationError:   400,
  UnauthorizedError: 401,
  ForbiddenError:    403,
  NotFoundError:     404,
  ConflictError:     409,
  RateLimitError:    429,
};

/**
 * Global error handler.
 * Must have exactly 4 parameters for Express to recognise it as error middleware.
 */
function errorHandler(err, req, res, next) {
  const isDev = config.app.env === 'development';

  // Determine HTTP status
  const status = err.statusCode || STATUS_MAP[err.name] || 500;

  // Log to stderr (swap with Winston/Pino in production)
  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.url} →`, err.message);
    if (isDev) console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack, type: err.name }),
  });
}

/**
 * 404 catch-all — must be registered AFTER all routes.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
}

/**
 * Convenience factory for typed errors.
 */
function createError(message, name, statusCode) {
  const err = new Error(message);
  err.name = name;
  err.statusCode = statusCode;
  return err;
}

module.exports = {
  errorHandler,
  notFound,
  createError,
  ValidationError:   (msg) => createError(msg, 'ValidationError', 400),
  UnauthorizedError: (msg) => createError(msg, 'UnauthorizedError', 401),
  ForbiddenError:    (msg) => createError(msg, 'ForbiddenError', 403),
  NotFoundError:     (msg) => createError(msg, 'NotFoundError', 404),
  ConflictError:     (msg) => createError(msg, 'ConflictError', 409),
};
