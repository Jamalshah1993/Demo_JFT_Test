/**
 * backend/routes/progress.routes.js
 * User progress & dashboard routes — all protected.
 */

'use strict';

const { requireAuth }     = require('../middleware/auth');
const progressController  = require('../controllers/progressController');

function mount(router) {
  router.get('/api/progress/dashboard',              [requireAuth], progressController.getDashboard);
  router.get('/api/progress/attempts/:attemptId',    [requireAuth], progressController.getAttemptResult);
}

module.exports = { mount };
