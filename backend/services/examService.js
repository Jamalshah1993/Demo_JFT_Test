/**
 * backend/services/examService.js
 * Exam retrieval and question management service.
 *
 * Questions are stripped of the correct answer before being sent to the
 * client — answers are only revealed after submission.
 */

'use strict';

const { EXAMS }    = require('../../database/questions.data');
const { NotFoundError } = require('../middleware/errorHandler');

// ─── Public (client-safe) shapes ─────────────────────────────────────────────

/**
 * Strip sensitive fields (correct answer, explanation) from a question
 * so the client cannot cheat by inspecting the API response.
 * @param {object} q
 * @returns {object}
 */
function sanitiseQuestion(q) {
  const { correct, explanation, tip, ...safe } = q;
  return safe;
}

/**
 * Public exam summary (no questions).
 */
function summariseExam(exam, attemptSummary = null) {
  return {
    id:          exam.id,
    title:       exam.title,
    difficulty:  exam.difficulty,
    description: exam.description,
    questionCount: exam.questions.length,
    sections: [...new Set(exam.questions.map(q => q.section))],
    attempt: attemptSummary,
  };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Get all exams (summary only, no questions, no answers).
 * @param {object} [latestAttempts]  keyed by examId from DB
 */
function getAllExams(latestAttempts = {}) {
  return EXAMS.map(exam => {
    const attempt = latestAttempts[exam.id] || null;
    const summary = attempt
      ? { score: attempt.score, passed: attempt.passed, completedAt: attempt.completedAt }
      : null;
    return summariseExam(exam, summary);
  });
}

/**
 * Get a single exam with its questions (answers stripped).
 * @param {string} examId
 * @returns {{ exam: object, questions: object[] }}
 */
function getExamById(examId) {
  const exam = EXAMS.find(e => e.id === examId);
  if (!exam) throw NotFoundError(`Exam "${examId}" not found.`);

  return {
    exam: summariseExam(exam),
    questions: exam.questions.map(sanitiseQuestion),
  };
}

/**
 * Get all question IDs and sections for an exam (used by progress tracker).
 */
function getExamMeta(examId) {
  const exam = EXAMS.find(e => e.id === examId);
  if (!exam) throw NotFoundError(`Exam "${examId}" not found.`);
  return exam.questions.map(q => ({ id: q.id, section: q.section }));
}

/**
 * Given the exam ID, look up the raw (un-sanitised) questions.
 * INTERNAL USE ONLY — never expose to client.
 * @param {string} examId
 * @returns {object[]}
 */
function getExamQuestionsInternal(examId) {
  const exam = EXAMS.find(e => e.id === examId);
  if (!exam) throw NotFoundError(`Exam "${examId}" not found.`);
  return exam.questions;
}

module.exports = { getAllExams, getExamById, getExamQuestionsInternal, getExamMeta };
