/**
 * frontend/js/router.js
 * Client-side SPA router.
 */

var Router = (function() {
  var routes = [];

  function on(pattern, handler) {
    routes.push({
      pattern: new RegExp('^' + pattern + '$'),
      handler: handler,
    });
  }

  function navigate(path) {
    window.history.pushState({}, '', path);
    dispatch();
  }

  function replace(path) {
    window.history.replaceState({}, '', path);
    dispatch();
  }

  function dispatch() {
    var path = window.location.pathname;
    for (var i = 0; i < routes.length; i++) {
      var match = path.match(routes[i].pattern);
      if (match) {
        try {
          routes[i].handler.apply(null, match.slice(1));
        } catch(e) {
          console.error('Router error:', e);
        }
        return;
      }
    }
    // 404
    var app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div class="empty-state" style="padding:80px;text-align:center">' +
        '<div style="font-size:3rem">🗺️</div>' +
        '<h3>পাতা পাওয়া যায়নি</h3>' +
        '<a href="/" class="btn btn--primary" style="margin-top:20px;display:inline-flex">🏠 হোমে ফিরুন</a>' +
        '</div>';
    }
  }

  window.addEventListener('popstate', function() { dispatch(); });

  // Intercept same-origin link clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//') && !link.getAttribute('data-external')) {
      e.preventDefault();
      navigate(href);
    }
  });

  return { on: on, navigate: navigate, replace: replace, dispatch: dispatch };
})();

window.Router = Router;
