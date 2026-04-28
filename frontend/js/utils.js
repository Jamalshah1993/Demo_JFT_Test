/**
 * frontend/js/utils.js
 * Shared utility functions.
 */

var Utils = {

  esc: function(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  $:  function(sel, ctx) { return (ctx || document).querySelector(sel); },
  $$: function(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); },

  setContent: function(el, content) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) el.innerHTML = content;
  },

  // ─── Toast ───────────────────────────────────────────────────────────────

  toast: function(message, type, duration) {
    type = type || 'info';
    duration = duration || 3500;
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function() {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, duration);
  },

  success: function(msg) { Utils.toast(msg, 'success'); },
  error:   function(msg) { Utils.toast(msg, 'error'); },
  info:    function(msg) { Utils.toast(msg, 'info'); },
  warn:    function(msg) { Utils.toast(msg, 'warn'); },

  // ─── Format ───────────────────────────────────────────────────────────────

  formatTime: function(seconds) {
    var m = Math.floor(seconds / 60).toString().padStart(2, '0');
    var s = (seconds % 60).toString().padStart(2, '0');
    return m + ':' + s;
  },

  formatDate: function(isoString) {
    return new Date(isoString).toLocaleDateString('bn-BD', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  },

  scoreColor: function(pct) {
    if (pct >= 80) return 'var(--green)';
    if (pct >= 60) return 'var(--amber)';
    return 'var(--red)';
  },

  // ─── Form ─────────────────────────────────────────────────────────────────

  setFieldError: function(fieldId, message) {
    var field   = document.getElementById(fieldId);
    var errorEl = document.getElementById(fieldId + '-error');
    if (field)   field.classList.toggle('form-input--error', !!message);
    if (errorEl) errorEl.textContent = message || '';
  },

  clearFormErrors: function(form) {
    var errors = form.querySelectorAll('[id$="-error"]');
    errors.forEach(function(el) { el.textContent = ''; });
    var inputs = form.querySelectorAll('.form-input--error');
    inputs.forEach(function(el) { el.classList.remove('form-input--error'); });
  },

  // ─── Theme ────────────────────────────────────────────────────────────────

  getTheme: function() {
    return localStorage.getItem('jft_theme') || 'light';
  },

  setTheme: function(theme) {
    localStorage.setItem('jft_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleTheme: function() {
    var next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  },

  initTheme: function() {
    this.setTheme(this.getTheme());
  },
};

window.Utils = Utils;
