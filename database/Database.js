/**
 * database/Database.js
 * Data Access Object (DAO) — database abstraction layer.
 *
 * Uses JSON file storage for zero-dependency operation.
 * Swap this class with a SQLite/PostgreSQL adapter and no other
 * file in the project needs to change (Open/Closed Principle).
 *
 * PRODUCTION NOTE: Replace the _read/_write methods with:
 *   const db = require('better-sqlite3')(config.database.path);
 *   and use prepared statements for each query method.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/config');

class Database {
  constructor() {
    this.dbPath = config.database.path;
    this._ensureDb();
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /** Read entire DB from disk */
  _read() {
    const raw = fs.readFileSync(this.dbPath, 'utf8');
    return JSON.parse(raw);
  }

  /** Write entire DB to disk atomically (write temp → rename) */
  _write(data) {
    const tmp = this.dbPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, this.dbPath);
  }

  /** Ensure database file and schema exist */
  _ensureDb() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(this.dbPath)) {
      this._write({
        users:     [],
        sessions:  [],
        progress:  [],
        attempts:  [],
        __meta: {
          version: '1.0.0',
          created: new Date().toISOString(),
          description: 'JFT-Basic Platform Database',
        },
      });
    }
  }

  /** Generate a UUID v4 */
  generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  createUser({ name, email, passwordHash }) {
    const db = this._read();
    const user = {
      id: this.generateId(),
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);
    this._write(db);
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }

  findUserByEmail(email) {
    const db = this._read();
    return db.users.find(u => u.email === email.toLowerCase().trim()) || null;
  }

  findUserById(id) {
    const db = this._read();
    const u = db.users.find(u => u.id === id);
    if (!u) return null;
    const { passwordHash, ...safe } = u;
    return safe;
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  createSession({ userId, token, expiresAt }) {
    const db = this._read();
    // Remove any existing sessions for this user (single-session policy)
    db.sessions = db.sessions.filter(s => s.userId !== userId);
    db.sessions.push({ id: this.generateId(), userId, token, expiresAt, createdAt: new Date().toISOString() });
    this._write(db);
  }

  findSession(token) {
    const db = this._read();
    return db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date()) || null;
  }

  deleteSession(token) {
    const db = this._read();
    db.sessions = db.sessions.filter(s => s.token !== token);
    this._write(db);
  }

  // ─── Exam Attempts ────────────────────────────────────────────────────────

  /**
   * Save a completed exam attempt with all answers and scores.
   * @param {object} attempt
   */
  saveAttempt({ userId, examId, answers, score, passed, sectionScores, durationSeconds }) {
    const db = this._read();
    const attempt = {
      id: this.generateId(),
      userId,
      examId,
      answers,       // array of { questionIndex, selected, correct, isCorrect }
      score,
      passed,
      sectionScores, // { '文字・語彙': { correct:3, total:4 }, ... }
      durationSeconds,
      completedAt: new Date().toISOString(),
    };
    db.attempts.push(attempt);
    this._write(db);
    return attempt;
  }

  /** Get all attempts for a user, newest first */
  getAttemptsByUser(userId) {
    const db = this._read();
    return db.attempts
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  }

  /** Get latest attempt for each exam by a user */
  getLatestAttemptPerExam(userId) {
    const attempts = this.getAttemptsByUser(userId);
    const latest = {};
    for (const attempt of attempts) {
      if (!latest[attempt.examId]) latest[attempt.examId] = attempt;
    }
    return latest;
  }

  /** Get aggregate stats for a user */
  getUserStats(userId) {
    const attempts = this.getAttemptsByUser(userId);
    if (attempts.length === 0) return { attempted: 0, avg: 0, best: 0, passed: 0 };

    return {
      attempted: attempts.length,
      avg: Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length),
      best: Math.max(...attempts.map(a => a.score)),
      passed: attempts.filter(a => a.passed).length,
    };
  }

  /** Get a single attempt by ID */
  getAttemptById(attemptId) {
    const db = this._read();
    return db.attempts.find(a => a.id === attemptId) || null;
  }
}

// Singleton — one DB connection per process
module.exports = new Database();
