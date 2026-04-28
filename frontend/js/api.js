/**
 * frontend/js/api.js
 * Centralised API client — safe window.Auth reference.
 */

const API_BASE = window.location.origin + '/api';

async function request(endpoint, opts) {
  opts = opts || {};
  // Safe reference — Auth may not be loaded yet for guests
  var token = (window.Auth && window.Auth.getToken) ? window.Auth.getToken() : null;

  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts.headers) {
    for (var k in opts.headers) headers[k] = opts.headers[k];
  }

  var fetchOpts = { method: opts.method || 'GET', headers: headers };
  if (opts.body) fetchOpts.body = opts.body;

  var response;
  try {
    response = await fetch(API_BASE + endpoint, fetchOpts);
  } catch (err) {
    throw new Error('সার্ভারের সাথে সংযোগ হচ্ছে না।');
  }

  var json;
  try { json = await response.json(); }
  catch (e) { json = { success: false, message: 'Invalid response' }; }

  if (!response.ok) {
    var err = new Error(json.message || 'HTTP ' + response.status);
    err.status = response.status;
    throw err;
  }

  return json.data;
}

var get  = function(url)       { return request(url, { method: 'GET' }); };
var post = function(url, body) { return request(url, { method: 'POST', body: JSON.stringify(body) }); };

window.API = {
  Auth: {
    register: function(data) { return post('/auth/register', data); },
    login:    function(data) { return post('/auth/login', data); },
    logout:   function()     { return post('/auth/logout'); },
    me:       function()     { return get('/auth/me'); },
  },
  Exam: {
    list:   function()             { return get('/exams'); },
    get:    function(examId)       { return get('/exams/' + examId); },
    submit: function(examId, data) { return post('/exams/' + examId + '/submit', data); },
  },
  Progress: {
    dashboard: function()          { return get('/progress/dashboard'); },
    attempt:   function(id)        { return get('/progress/attempts/' + id); },
  },
};
