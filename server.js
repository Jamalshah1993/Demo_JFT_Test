/**
 * server.js
 * Main server entry point.
 *
 * Pure Node.js http server — zero npm dependencies.
 * Architecture:
 *   Request → CORS → Rate Limiter → Router → Controller → Service → DB → Response
 *
 * To upgrade to Express: replace _parseRequest/_sendJSON with Express equivalents
 * and call router.get/post/put/delete directly. No other files need to change.
 */

'use strict';

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const url     = require('url');
const config  = require('./config/config');

// ─── Route Registry ────────────────────────────────────────────────────────────

const routes = []; // [{ method, pattern, middlewares, handler }]

const router = {
  get:    (p, mw, h) => routes.push({ method: 'GET',    pattern: _toRegex(p), middlewares: mw, handler: h || mw, path: p }),
  post:   (p, mw, h) => routes.push({ method: 'POST',   pattern: _toRegex(p), middlewares: mw, handler: h || mw, path: p }),
  put:    (p, mw, h) => routes.push({ method: 'PUT',    pattern: _toRegex(p), middlewares: mw, handler: h || mw, path: p }),
  delete: (p, mw, h) => routes.push({ method: 'DELETE', pattern: _toRegex(p), middlewares: mw, handler: h || mw, path: p }),
};

function _toRegex(pattern) {
  // First escape regex special chars (except : which marks params)
  // Then replace :paramName with named capture groups
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // escape regex specials
    .replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, '(?<$1>[^/]+)');  // :param → named group
  return new RegExp(`^${escaped}$`);
}

// ─── Mount Routes ──────────────────────────────────────────────────────────────

require('./backend/routes/auth.routes').mount(router);
require('./backend/routes/exam.routes').mount(router);
require('./backend/routes/progress.routes').mount(router);

// ─── MIME Types ────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
};

// ─── Request Parser ────────────────────────────────────────────────────────────

function _parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_048_576) { reject(new Error('Payload too large')); req.destroy(); }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// ─── Response Helpers ──────────────────────────────────────────────────────────

function _json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function _setCorsHeaders(req, res) {
  const origin = req.headers['origin'];
  const allowed = config.server.cors.allowedOrigins;
  if (!origin || allowed.includes(origin) || config.app.env === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', config.server.cors.allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', config.server.cors.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Max-Age', '86400');
}

function _setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ─── Static File Server ────────────────────────────────────────────────────────

function _serveStatic(req, res, filePath) {
  const ext      = path.extname(filePath);
  const mimeType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For SPA: return index.html for unknown routes
      const indexPath = path.join(config.app.frontendDir, 'index.html');
      fs.readFile(indexPath, (err2, indexData) => {
        if (err2) { _json(res, 404, { success: false, message: 'Not found' }); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(indexData);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(data);
  });
}

// ─── Middleware Runner ────────────────────────────────────────────────────────

async function _runMiddlewares(middlewares, req, res) {
  for (const mw of middlewares) {
    let calledNext = false;
    await new Promise((resolve) => {
      mw(req, res, () => { calledNext = true; resolve(); });
      // If middleware did NOT call next (sent response itself), resolve anyway after tick
      setImmediate(() => { if (!calledNext) resolve(); });
    });
    if (res.writableEnded) return false;
  }
  return true;
}

// ─── Main Request Handler ─────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsed  = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Attach Express-compatible helpers
  req.query  = parsed.query;
  req.params = {};
  req.body   = {};
  // res.status(code)  → sets status, returns res (chainable)
  // res.json(data)    → sends current status (default 200) with JSON body
  res._statusCode = 200;
  res.status = function(code) { this._statusCode = code; return this; };
  res.json   = function(data) { _json(this, this._statusCode, data); };

  _setCorsHeaders(req, res);
  _setSecurityHeaders(res);

  // Preflight
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Logging
  if (config.logging.requests) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  }

  // ── API Routing ──
  if (pathname.startsWith('/api/')) {
    req.body = await _parseBody(req).catch(() => ({}));

    for (const route of routes) {
      if (route.method !== req.method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      // Extract named params
      if (match.groups) req.params = match.groups;

      try {
        // Separate middleware array from final handler
        const middlewares = Array.isArray(route.middlewares) ? route.middlewares : [];
        const handlerFn   = typeof route.handler === 'function'
          ? route.handler
          : middlewares[middlewares.length - 1]; // fallback

        const passed = await _runMiddlewares(middlewares, req, res);
        if (!passed || res.writableEnded) return;

        await handlerFn(req, res, (err) => { if (err) _handleError(err, res); });
      } catch (err) {
        _handleError(err, res);
      }
      return;
    }

    // 404 API
    _json(res, 404, { success: false, message: `Route not found: ${req.method} ${pathname}` });
    return;
  }

  // ── Static File Serving ──
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = '/index.html';

  const filePath = path.join(config.app.frontendDir, safePath);

  // Security: must stay within frontend dir
  if (!filePath.startsWith(config.app.frontendDir)) {
    _json(res, 403, { success: false, message: 'Forbidden' });
    return;
  }

  _serveStatic(req, res, filePath);
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

function _handleError(err, res) {
  if (res.writableEnded) return;
  const STATUS_MAP = { ValidationError: 400, UnauthorizedError: 401, ForbiddenError: 403, NotFoundError: 404, ConflictError: 409, RateLimitError: 429 };
  const status = err.statusCode || STATUS_MAP[err.name] || 500;
  if (status >= 500) console.error('[ERROR]', err.message, err.stack);
  _json(res, status, { success: false, message: err.message || 'Internal server error' });
}

// ─── Start ─────────────────────────────────────────────────────────────────────

server.listen(config.app.port, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🎌 ${config.app.name}`);
  console.log(`  🚀 Running: http://localhost:${config.app.port}`);
  console.log(`  🌍 Mode:    ${config.app.env}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${config.app.port} is already in use.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

module.exports = server;
