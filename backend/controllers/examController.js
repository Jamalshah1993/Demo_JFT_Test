/**
 * backend/controllers/examController.js
 * Exam HTTP request handlers.
 */

'use strict';

const db              = require('../../database/Database');
const examService     = require('../services/examService');
const progressService = require('../services/progressService');

/**
 * GET /api/exams
 * Returns all exams with the user's latest attempt summary (if logged in).
 */
async function listExams(req, res, next) {
  try {
    const latestAttempts = req.user
      ? db.getLatestAttemptPerExam(req.user.userId)
      : {};

    const exams = examService.getAllExams(latestAttempts);
    res.json({ success: true, data: exams });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/exams/:examId
 * Returns a single exam with sanitised questions (no correct answers).
 */
async function getExam(req, res, next) {
  try {
    const { examId } = req.params;
    const data = examService.getExamById(examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/exams/:examId/submit
 * Grades the exam server-side and saves the attempt.
 * Body: { answers: number[], durationSeconds: number }
 */
async function submitExam(req, res, next) {
  try {
    const { examId } = req.params;
    const { answers, durationSeconds } = req.body;

    const result = await progressService.submitExam({
      userId: req.user.userId,
      examId,
      answers,
      durationSeconds: durationSeconds || 0,
    });

    res.json({
      success: true,
      message: result.passed ? 'পরীক্ষা সম্পন্ন — পাস!' : 'পরীক্ষা সম্পন্ন।',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listExams, getExam, submitExam };
