/**
 * frontend/components/Navbar.js
 * Navbar component — auth-aware navigation.
 */

var Navbar = {

  mount: function(container) {
    container.innerHTML = this._template();
    this._bindEvents(container);
    this._syncAuth(container);
    this._syncTheme(container);
    this._markActive(container);

    // Re-render when auth changes
    if (window.Auth) {
      window.Auth.subscribe(function() {
        Navbar._syncAuth(container);
      });
    }

    window.addEventListener('popstate', function() {
      Navbar._markActive(container);
    });
  },

  _template: function() {
    return '<nav class="navbar">' +
      '<div class="navbar__inner">' +

      // Logo
      '<a href="/" class="navbar__logo" style="text-decoration:none">' +
        '<span class="navbar__logo-jp">日</span>' +
        '<div>' +
          '<div class="navbar__logo-text">JFT-Basic প্রস্তুতি</div>' +
          '<div class="navbar__logo-sub">বাংলাদেশী শিক্ষার্থীদের জন্য</div>' +
        '</div>' +
      '</a>' +

      // Nav links
      '<div class="navbar__links" id="nav-links">' +
        '<a href="/"          class="navbar__link" data-path="/">🏠 হোম</a>' +
        '<a href="/about"     class="navbar__link" data-path="/about">📚 JFT কী?</a>' +
        '<a href="/exams"     class="navbar__link" data-path="/exams">✏️ মক পরীক্ষা</a>' +
        '<a href="/visa"      class="navbar__link" data-path="/visa">🛂 ভিসা গাইড</a>' +
        '<a href="/dashboard" class="navbar__link" data-path="/dashboard" id="nav-dashboard" style="display:none">📊 ড্যাশবোর্ড</a>' +
      '</div>' +

      // Actions
      '<div class="navbar__actions">' +
        '<button class="btn--toggle" id="theme-toggle">🌙</button>' +
        '<div id="nav-auth-out" style="display:flex;gap:8px;align-items:center">' +
          '<a href="/login"    class="btn btn--ghost btn--sm">লগইন</a>' +
          '<a href="/register" class="btn btn--primary btn--sm">নিবন্ধন</a>' +
        '</div>' +
        '<div id="nav-auth-in" style="display:none;gap:8px;align-items:center">' +
          '<span id="nav-username" style="font-size:0.82rem;color:var(--text-muted)"></span>' +
          '<button class="btn btn--ghost btn--sm" id="nav-logout">লগআউট</button>' +
        '</div>' +
      '</div>' +

      '</div>' +
    '</nav>';
  },

  _bindEvents: function(container) {
    var themeBtn = container.querySelector('#theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        var next = Utils.toggleTheme();
        themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
      });
    }

    var logoutBtn = container.querySelector('#nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        if (window.Auth) window.Auth.logout();
      });
    }
  },

  _syncAuth: function(container) {
    var loggedIn      = window.Auth ? window.Auth.isLoggedIn() : false;
    var user          = window.Auth ? window.Auth.getUser() : null;
    var authOut       = container.querySelector('#nav-auth-out');
    var authIn        = container.querySelector('#nav-auth-in');
    var navDashboard  = container.querySelector('#nav-dashboard');
    var username      = container.querySelector('#nav-username');

    if (authOut)     authOut.style.display     = loggedIn ? 'none' : 'flex';
    if (authIn)      authIn.style.display      = loggedIn ? 'flex' : 'none';
    if (navDashboard) navDashboard.style.display = loggedIn ? 'flex' : 'none';
    if (username && user) username.textContent = '👋 ' + user.name;
  },

  _syncTheme: function(container) {
    var btn = container.querySelector('#theme-toggle');
    if (btn) btn.textContent = Utils.getTheme() === 'dark' ? '☀️' : '🌙';
  },

  _markActive: function(container) {
    var path = window.location.pathname;
    var links = container.querySelectorAll('.navbar__link');
    links.forEach(function(link) {
      var lp = link.getAttribute('data-path');
      var active = lp === '/' ? path === '/' : path.startsWith(lp);
      link.classList.toggle('navbar__link--active', active);
    });
  },
};

window.Navbar = Navbar;
