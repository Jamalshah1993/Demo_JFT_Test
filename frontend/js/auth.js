/**
 * frontend/js/auth.js
 * Client-side authentication state manager.
 */

var TOKEN_KEY = 'jft_token';
var USER_KEY  = 'jft_user';

var Auth = {

  getToken: function() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser: function() {
    try {
      var u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  },

  isLoggedIn: function() {
    return !!(this.getToken() && this.getUser());
  },

  setSession: function(data) {
    if (data && data.user && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      this._notify();
    }
  },

  clearSession: function() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._notify();
  },

  login: async function(email, password) {
    var data = await window.API.Auth.login({ email: email, password: password });
    this.setSession(data);
    return data;
  },

  register: async function(name, email, password) {
    var data = await window.API.Auth.register({ name: name, email: email, password: password });
    this.setSession(data);
    return data;
  },

  logout: async function() {
    try { await window.API.Auth.logout(); } catch(e) {}
    this.clearSession();
    if (window.Router) window.Router.navigate('/login');
    else window.location.href = '/login';
  },

  _subscribers: [],

  subscribe: function(fn) {
    this._subscribers.push(fn);
  },

  _notify: function() {
    var state = { isLoggedIn: this.isLoggedIn(), user: this.getUser() };
    for (var i = 0; i < this._subscribers.length; i++) {
      try { this._subscribers[i](state); } catch(e) {}
    }
  },

  requireAuth: function() {
    if (!this.isLoggedIn()) {
      if (window.Router) {
        window.Router.navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      } else {
        window.location.href = '/login';
      }
      return false;
    }
    return true;
  },
};

window.Auth = Auth;
