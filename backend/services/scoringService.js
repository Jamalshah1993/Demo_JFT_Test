/**
 * backend/services/scoringService.js
 * Exam scoring engine.
 *
 * Isolated scoring logic makes it trivially testable.
 * The scoring algorithm mirrors the real JFT-Basic scaled-score system.
 */

'use strict';

const config = require('../../config/config');
const { ValidationError } = require('../middleware/errorHandler');

const { passingScore, minScore, maxScore } = config.exam;

// ─── Scoring Algorithm ────────────────────────────────────────────────────────

/**
 * Convert raw correct-answer ratio to JFT-Basic scale score (10–250).
 * JFT uses IRT (Item Response Theory) in reality; we use linear interpolation
 * as a close approximation for a practice platform.
 *
 * @param {number} correct   number of correct answers
 * @param {number} total     total number of questions
 * @returns {number}         scaled score 10–250
 */
function calculateScaledScore(correct, total) {
  if (total === 0) return minScore;
  const ratio = correct / total;
  return Math.round(minScore + ratio * (maxScore - minScore));
}

/**
 * Calculate per-section scores.
 * @param {object[]} questions  raw questions (with correct field)
 * @param {number[]} answers    user's answers (index, -1 = unanswered)
 * @returns {object}            { '文字・語彙': { correct, total, pct }, ... }
 */
function calculateSectionScores(questions, answers) {
  const sections = {};

  questions.forEach((q, i) => {
    if (!sections[q.section]) {
      sections[q.section] = { correct: 0, total: 0, sectionBn: q.sectionBn };
    }
    sections[q.section].total++;
    if (answers[i] === q.correct) sections[q.section].correct++;
  });

  // Add percentage
  for (const sec of Object.values(sections)) {
    sec.pct = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0;
  }

  return sections;
}

/**
 * Build per-question result (includes correct answer + explanation for feedback).
 * @param {object[]} questions
 * @param {number[]} answers
 * @returns {object[]}
 */
function buildQuestionResults(questions, answers) {
  return questions.map((q, i) => ({
    index:       i,
    questionId:  q.id,
    section:     q.section,
    sectionBn:   q.sectionBn,
    category:    q.category,
    question:    q.question,
    jp:          q.jp,
    bn:          q.bn,
    options:     q.options,
    selected:    answers[i],
    correct:     q.correct,
    isCorrect:   answers[i] === q.correct,
    explanation: q.explanation,
    tip:         q.tip,
  }));
}

// ─── Public Interface ─────────────────────────────────────────────────────────

/**
 * Grade a completed exam submission.
 *
 * @param {object[]} questions   Raw questions (from examService internal)
 * @param {number[]} answers     User's answers — array of option indices
 * @param {number}   duration    Seconds taken
 * @returns {object}             Full graded result
 */
function gradeExam(questions, answers, duration) {
  // Validate
  if (!Array.isArray(answers)) throw ValidationError('Answers must be an array.');
  if (answers.length !== questions.length) {
    throw ValidationError(`Expected ${questions.length} answers, got ${answers.length}.`);
  }

  const correct      = answers.filter((a, i) => a === questions[i].correct).length;
  const total        = questions.length;
  const score        = calculateScaledScore(correct, total);
  const passed       = score >= passingScore;
  const sectionScores = calculateSectionScores(questions, answers);
  const questionResults = buildQuestionResults(questions, answers);

  // Identify strengths and weaknesses
  const strengths  = Object.entries(sectionScores).filter(([,v]) => v.pct >= 80).map(([k,v]) => ({ section: k, sectionBn: v.sectionBn, pct: v.pct }));
  const weaknesses = Object.entries(sectionScores).filter(([,v]) => v.pct <  60).map(([k,v]) => ({ section: k, sectionBn: v.sectionBn, pct: v.pct }));

  return {
    score,
    passed,
    correct,
    total,
    percentage:       Math.round((correct / total) * 100),
    sectionScores,
    questionResults,
    strengths,
    weaknesses,
    durationSeconds:  duration,
    passingScore,
    message: passed
      ? `অভিনন্দন! আপনি ${score} পয়েন্ট পেয়েছেন এবং JFT-Basic পাস করার যোগ্যতা দেখিয়েছেন।`
      : `আপনি ${score} পয়েন্ট পেয়েছেন। পাসের জন্য ${passingScore} পয়েন্ট দরকার। আরও ${passingScore - score} পয়েন্ট বাড়ান।`,
  };
}

module.exports = { gradeExam, calculateScaledScore, calculateSectionScores };
