/**
 * backend/controllers/authController.js
 * Auth HTTP request handlers (Controllers).
 *
 * Controllers are thin — they parse the request, delegate to the service,
 * and return the HTTP response. Zero business logic lives here.
 */

'use strict';

const authService = require('../services/authService');

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    res.status(201).json({
      success: true,
      message: 'অ্যাকাউন্ট তৈরি হয়েছে।',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({
      success: true,
      message: 'লগইন সফল হয়েছে।',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Requires: Authorization: Bearer <token>
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.token);
    res.json({ success: true, message: 'লগআউট সফল হয়েছে।' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me };
