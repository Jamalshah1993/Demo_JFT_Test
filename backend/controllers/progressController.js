/**
 * backend/controllers/progressController.js
 * User progress and dashboard HTTP handlers.
 */

'use strict';

const progressService = require('../services/progressService');

/**
 * GET /api/progress/dashboard
 * Returns the user's stats, history, and latest attempt per exam.
 */
async function getDashboard(req, res, next) {
  try {
    const data = await progressService.getDashboard(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/attempts/:attemptId
 * Returns full question-by-question breakdown for a past attempt.
 */
async function getAttemptResult(req, res, next) {
  try {
    const data = await progressService.getAttemptResult(req.user.userId, req.params.attemptId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getAttemptResult };
