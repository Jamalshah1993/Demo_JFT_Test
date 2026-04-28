/**
 * frontend/js/auth.js
 * Client-side authentication state manager.
 *
 * Manages token storage and provides reactive auth state
 * consumed by all pages.
 *
 * Token storage: localStorage (simple). For higher security,
 * use httpOnly cookies (requires backend change).
 */

const TOKEN_KEY = 'jft_token';
const USER_KEY  = 'jft_user';

const Auth = {
  // ─── State ───────────────────────────────────────────────────────────────

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  // ─── Mutations ───────────────────────────────────────────────────────────

  setSession({ user, token }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._notify();
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._notify();
  },

  // ─── Actions ─────────────────────────────────────────────────────────────

  async login(email, password) {
    const data = await window.API.Auth.login({ email, password });
    this.setSession(data);
    return data;
  },

  async register(name, email, password) {
    const data = await window.API.Auth.register({ name, email, password });
    this.setSession(data);
    return data;
  },

  async logout() {
    try { await window.API.Auth.logout(); } catch {} // best-effort
    this.clearSession();
    Router.navigate('/login');
  },

  // ─── Reactive Subscribers ────────────────────────────────────────────────

  _subscribers: [],

  subscribe(fn) {
    this._subscribers.push(fn);
    return () => { this._subscribers = this._subscribers.filter(s => s !== fn); };
  },

  _notify() {
    const state = { isLoggedIn: this.isLoggedIn(), user: this.getUser() };
    this._subscribers.forEach(fn => fn(state));
  },

  // ─── Guard ───────────────────────────────────────────────────────────────

  /** Redirect to /login if not authenticated */
  requireAuth() {
    if (!this.isLoggedIn()) {
      Router.navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return false;
    }
    return true;
  },
};

window.Auth = Auth;
