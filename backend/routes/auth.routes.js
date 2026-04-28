/**
 * backend/routes/auth.routes.js
 * Authentication routes.
 *
 * Route definitions are intentionally thin — they only wire HTTP verbs
 * to middleware chains. All logic lives in controllers and services.
 */

'use strict';

const { requireAuth }    = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const authController     = require('../controllers/authController');

/**
 * Mount auth routes on a router object.
 * @param {object} router  Minimal router (see server.js)
 */
function mount(router) {
  // Public routes — rate-limited to prevent brute-force
  router.post('/api/auth/register', [authRateLimiter], authController.register);
  router.post('/api/auth/login',    [authRateLimiter], authController.login);

  // Protected routes
  router.post('/api/auth/logout', [requireAuth], authController.logout);
  router.get('/api/auth/me',      [requireAuth], authController.me);
}

module.exports = { mount };
