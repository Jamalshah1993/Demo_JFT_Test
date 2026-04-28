/**
 * backend/middleware/rateLimiter.js
 * In-memory rate limiter (pure Node.js, no npm).
 *
 * In production: replace with Redis-backed rate limiter (e.g., rate-limiter-flexible)
 * for multi-instance deployments.
 */

'use strict';

const config = require('../../config/config');

const { windowMs, maxRequests } = config.server.rateLimit;

// Map<ip, { count: number, resetAt: number }>
const store = new Map();

// Purge expired entries every minute to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.resetAt <= now) store.delete(key);
  }
}, 60_000);

/**
 * General rate limiter middleware.
 */
function rateLimiter(req, res, next) {
  const key = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now  = Date.now();

  let record = store.get(key);
  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + windowMs };
    store.set(key, record);
  }

  record.count++;

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

  if (record.count > maxRequests) {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
    return;
  }

  next();
}

/**
 * Stricter limiter for auth routes (5 attempts per 15 min).
 */
function authRateLimiter(req, res, next) {
  const key = `auth:${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'}`;
  const now  = Date.now();
  const authWindow = 15 * 60 * 1000;
  const authMax    = 10;

  let record = store.get(key);
  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + authWindow };
    store.set(key, record);
  }

  record.count++;

  if (record.count > authMax) {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please wait 15 minutes.',
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
    return;
  }

  next();
}

module.exports = { rateLimiter, authRateLimiter };
