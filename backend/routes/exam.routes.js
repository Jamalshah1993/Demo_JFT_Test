/**
 * backend/routes/exam.routes.js
 * Exam routes.
 */

'use strict';

const { requireAuth, optionalAuth } = require('../middleware/auth');
const examController = require('../controllers/examController');

function mount(router) {
  // List all exams — optional auth so attempt data is shown to logged-in users
  router.get('/api/exams',                  [optionalAuth], examController.listExams);

  // Get single exam with questions (no answers) — public
  router.get('/api/exams/:examId',           [],             examController.getExam);

  // Submit exam — requires auth so result is saved to profile
  router.post('/api/exams/:examId/submit',  [requireAuth],  examController.submitExam);
}

module.exports = { mount };
