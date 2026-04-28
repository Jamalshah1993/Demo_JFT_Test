/**
 * backend/middleware/auth.js
 * Authentication middleware.
 *
 * Validates tokens on protected routes, attaches user to request.
 * Uses HMAC-SHA256 for token validation (pure Node.js, no jwt library).
 */

'use strict';

const crypto = require('crypto');
const config  = require('../../config/config');
const db      = require('../../database/Database');

// ─── Token Helpers ────────────────────────────────────────────────────────────

/**
 * Create a signed token: base64(payload) + "." + HMAC signature.
 * @param {object} payload
 * @returns {string}
 */
function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto
    .createHmac('sha256', config.auth.jwtSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify and decode a token.
 * @param {string} token
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'No token provided' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token' };
  }

  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', config.auth.jwtSecret)
    .update(data)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Could not parse token payload' };
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Require authentication. Attach req.user if valid.
 * Returns 401 if token is missing/invalid.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const { valid, payload, error } = verifyToken(token);
  if (!valid) {
    res.status(401).json({ success: false, message: `Unauthorized: ${error}` });
    return;
  }

  // Check session still exists in DB (supports server-side logout)
  const session = db.findSession(token);
  if (!session) {
    res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    return;
  }

  req.user   = payload;
  req.token  = token;
  next();
}

/**
 * Optional auth — attaches req.user if token is valid, but never blocks.
 * Useful for routes that have different behaviour for logged-in users.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const { valid, payload } = verifyToken(token);
  if (valid && token) {
    const session = db.findSession(token);
    if (session) req.user = payload;
  }
  next();
}

module.exports = { requireAuth, optionalAuth, createToken, verifyToken };
