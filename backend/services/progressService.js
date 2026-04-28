/**
 * backend/services/progressService.js
 * User progress tracking and analytics service.
 */

'use strict';

const db          = require('../../database/Database');
const examService = require('./examService');
const scoringService = require('./scoringService');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Submit a completed exam and save result.
 *
 * @param {string}   userId
 * @param {string}   examId
 * @param {number[]} answers         Array of selected option indices (-1 = unanswered)
 * @param {number}   durationSeconds How long the user took
 * @returns {object}                 Full graded result
 */
async function submitExam({ userId, examId, answers, durationSeconds }) {
  if (!examId)  throw ValidationError('examId is required.');
  if (!answers) throw ValidationError('answers array is required.');

  // Grade server-side (answers never trusted from client)
  const questions = examService.getExamQuestionsInternal(examId);
  const result    = scoringService.gradeExam(questions, answers, durationSeconds);

  // Persist
  const attempt = db.saveAttempt({
    userId,
    examId,
    answers: result.questionResults.map(r => ({ qi: r.index, selected: r.selected, correct: r.correct, ok: r.isCorrect })),
    score:          result.score,
    passed:         result.passed,
    sectionScores:  result.sectionScores,
    durationSeconds,
  });

  return { ...result, attemptId: attempt.id };
}

/**
 * Get user's dashboard data: stats + history.
 * @param {string} userId
 */
async function getDashboard(userId) {
  const stats   = db.getUserStats(userId);
  const history = db.getAttemptsByUser(userId).slice(0, 20); // last 20
  const latestPerExam = db.getLatestAttemptPerExam(userId);

  // Attach exam titles to history
  const { EXAMS } = require('../../database/questions.data');
  const enriched = history.map(a => ({
    ...a,
    examTitle: EXAMS.find(e => e.id === a.examId)?.title || a.examId,
  }));

  return { stats, history: enriched, latestPerExam };
}

/**
 * Get a specific attempt's full result (for review page).
 * @param {string} userId
 * @param {string} attemptId
 */
async function getAttemptResult(userId, attemptId) {
  const attempt = db.getAttemptById(attemptId);
  if (!attempt) throw ValidationError('Attempt not found.');
  if (attempt.userId !== userId) throw ValidationError('Access denied.');

  const questions = examService.getExamQuestionsInternal(attempt.examId);

  // Reconstruct full question results
  const questionResults = questions.map((q, i) => ({
    index:       i,
    section:     q.section,
    sectionBn:   q.sectionBn,
    category:    q.category,
    question:    q.question,
    jp:          q.jp || null,
    bn:          q.bn || null,
    options:     q.options,
    selected:    attempt.answers[i]?.selected ?? -1,
    correct:     q.correct,
    isCorrect:   attempt.answers[i]?.ok ?? false,
    explanation: q.explanation,
    tip:         q.tip,
  }));

  return { attempt, questionResults };
}

module.exports = { submitExam, getDashboard, getAttemptResult };
