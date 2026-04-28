/**
 * backend/services/authService.js
 * Authentication business logic.
 *
 * The service layer is the heart of the application.
 * Controllers call services — services orchestrate DB and other services.
 * Services know nothing about HTTP (req/res).
 */

'use strict';

const crypto = require('crypto');
const config = require('../../config/config');
const db     = require('../../database/Database');
const { createToken } = require('../middleware/auth');
const { ConflictError, UnauthorizedError, ValidationError } = require('../middleware/errorHandler');

// ─── Password Hashing (PBKDF2 — pure Node.js) ─────────────────────────────────

function hashPassword(password) {
  const salt       = crypto.randomBytes(16).toString('hex');
  const iterations = 100_000;
  const keyLen     = 64;
  const digest     = 'sha512';
  const hash       = crypto.pbkdf2Sync(password, salt, iterations, keyLen, digest).toString('hex');
  return `${iterations}:${digest}:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [iterations, digest, salt, hash] = stored.split(':');
  const derived = crypto
    .pbkdf2Sync(password, salt, parseInt(iterations), 64, digest)
    .toString('hex');
  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password && password.length >= 8;
}

function validateName(name) {
  return name && name.trim().length >= 2;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @param {{ name: string, email: string, password: string }}
 * @returns {{ user: object, token: string }}
 */
async function register({ name, email, password }) {
  // Validate inputs
  if (!validateName(name))     throw ValidationError('নাম অন্তত ২ অক্ষরের হতে হবে।');
  if (!validateEmail(email))   throw ValidationError('ইমেইল ঠিকানা সঠিক নয়।');
  if (!validatePassword(password)) throw ValidationError('পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।');

  // Check duplicate
  const existing = db.findUserByEmail(email);
  if (existing) throw ConflictError('এই ইমেইল দিয়ে আগেই একটি অ্যাকাউন্ট আছে।');

  // Hash password and store
  const passwordHash = hashPassword(password);
  const user = db.createUser({ name: name.trim(), email, passwordHash });

  // Create session token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = createToken({ userId: user.id, email: user.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  db.createSession({ userId: user.id, token, expiresAt });

  return { user, token };
}

/**
 * Log in an existing user.
 * @param {{ email: string, password: string }}
 * @returns {{ user: object, token: string }}
 */
async function login({ email, password }) {
  if (!email || !password) throw ValidationError('ইমেইল এবং পাসওয়ার্ড দিন।');

  const userWithHash = db.findUserByEmail(email);
  if (!userWithHash) throw UnauthorizedError('ইমেইল বা পাসওয়ার্ড ভুল।');

  const passwordMatch = verifyPassword(password, userWithHash.passwordHash);
  if (!passwordMatch) throw UnauthorizedError('ইমেইল বা পাসওয়ার্ড ভুল।');

  const { passwordHash, ...user } = userWithHash;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = createToken({ userId: user.id, email: user.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  db.createSession({ userId: user.id, token, expiresAt });

  return { user, token };
}

/**
 * Log out — invalidate session.
 * @param {string} token
 */
async function logout(token) {
  db.deleteSession(token);
}

/**
 * Get authenticated user's profile.
 * @param {string} userId
 * @returns {object}
 */
async function getProfile(userId) {
  const user = db.findUserById(userId);
  if (!user) throw UnauthorizedError('User not found.');
  return user;
}

module.exports = { register, login, logout, getProfile };
