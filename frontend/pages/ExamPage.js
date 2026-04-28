/**
 * frontend/pages/ExamPage.js
 * Full exam experience — start, answer, timer, submit.
 *
 * State machine:
 *   idle → loading → ready → active → submitting → done
 */

const ExamPage = (() => {

  // ─── State ─────────────────────────────────────────────────────────────────
  let _state = {
    exam:          null,
    questions:     [],
    answers:       [],
    currentIndex:  0,
    timeLeft:      3600,
    startTime:     null,
    timerInterval: null,
    submitted:     false,
  };

  // ─── Mount ─────────────────────────────────────────────────────────────────

  async function mount(container, examId) {
    _reset();
    container.innerHTML = _shellTemplate();
    _bindShellEvents(container);

    try {
      _setStatus(container, 'loading', 'পরীক্ষা লোড হচ্ছে...');
      const data = await API.Exam.get(examId);
      _state.exam      = data.exam;
      _state.questions = data.questions;
      _state.answers   = new Array(data.questions.length).fill(-1);
      _state.startTime = Date.now();
      _state.timeLeft  = 3600;

      _renderQuestion(container);
      _startTimer(container);
    } catch (err) {
      Utils.error(`পরীক্ষা লোড হয়নি: ${err.message}`);
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__title">পরীক্ষা পাওয়া যায়নি</div>
        <a href="/exams" class="btn btn--primary" style="margin-top:16px;display:inline-flex">← ফিরুন</a>
      </div>`;
    }
  }

  // ─── Shell Template ────────────────────────────────────────────────────────

  function _shellTemplate() {
    return `
      <div class="exam-shell" id="exam-shell">
        <!-- Header -->
        <div class="exam-header">
          <div class="exam-header__info">
            <div class="exam-header__title" id="exam-title">লোড হচ্ছে...</div>
            <div class="exam-header__section" id="exam-section">সেকশন</div>
          </div>
          <div class="timer" id="exam-timer">
            <span class="timer__icon">⏱️</span>
            <span class="timer__time" id="timer-display">60:00</span>
          </div>
          <button class="btn btn--ghost btn--sm" id="btn-exit">✕ বন্ধ</button>
        </div>

        <!-- Progress strip -->
        <div class="exam-progress">
          <div class="exam-progress__fill" id="exam-progress" style="width:0%"></div>
        </div>

        <!-- Body -->
        <div class="exam-body">
          <div class="exam-body__inner" id="question-mount"></div>
        </div>

        <!-- Nav bar -->
        <div class="exam-nav">
          <div class="exam-nav__dots" id="q-dots"></div>
          <div class="exam-nav__btns">
            <button class="btn btn--ghost btn--sm" id="btn-prev">← আগে</button>
            <button class="btn btn--primary btn--sm" id="btn-next">পরে →</button>
            <button class="btn btn--green btn--sm" id="btn-submit" style="display:none">✓ জমা দিন</button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Question Rendering ────────────────────────────────────────────────────

  function _renderQuestion(container) {
    const q   = _state.questions[_state.currentIndex];
    const mount = container.querySelector('#question-mount');
    if (!mount || !q) return;

    // Update header
    const titleEl   = container.querySelector('#exam-title');
    const sectionEl = container.querySelector('#exam-section');
    if (titleEl)   titleEl.textContent   = _state.exam.title;
    if (sectionEl) sectionEl.textContent = `${q.sectionBn} — ${q.category}`;

    // Render question
    mount.innerHTML = QuestionRenderer.render(
      q, _state.currentIndex, _state.questions.length, _state.answers[_state.currentIndex]
    );
    mount.scrollTop = 0;

    // Bind option clicks
    QuestionRenderer.bindOptionClicks(mount, (idx) => {
      _state.answers[_state.currentIndex] = idx;
      _renderDots(container);
    });

    // Update progress bar
    const pct = ((_state.currentIndex + 1) / _state.questions.length * 100).toFixed(1);
    const bar = container.querySelector('#exam-progress');
    if (bar) bar.style.width = pct + '%';

    _renderDots(container);
    _updateNavButtons(container);
  }

  // ─── Navigation Dots ───────────────────────────────────────────────────────

  function _renderDots(container) {
    const dotsEl = container.querySelector('#q-dots');
    if (!dotsEl) return;
    dotsEl.innerHTML = _state.questions.map((_, i) => {
      let cls = 'q-dot';
      if (i === _state.currentIndex) cls += ' q-dot--current';
      else if (_state.answers[i] !== -1) cls += ' q-dot--answered';
      return `<div class="${cls}" data-qi="${i}" title="প্রশ্ন ${i + 1}"></div>`;
    }).join('');

    dotsEl.querySelectorAll('.q-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        _state.currentIndex = parseInt(dot.dataset.qi, 10);
        _renderQuestion(container);
      });
    });
  }

  function _updateNavButtons(container) {
    const total = _state.questions.length;
    const i     = _state.currentIndex;
    const prev   = container.querySelector('#btn-prev');
    const next   = container.querySelector('#btn-next');
    const submit = container.querySelector('#btn-submit');
    if (prev)   prev.style.display   = i === 0 ? 'none' : 'inline-flex';
    if (next)   next.style.display   = i === total - 1 ? 'none' : 'inline-flex';
    if (submit) submit.style.display = i === total - 1 ? 'inline-flex' : 'none';
  }

  // ─── Shell Events ──────────────────────────────────────────────────────────

  function _bindShellEvents(container) {
    container.addEventListener('click', (e) => {
      if (e.target.id === 'btn-prev' || e.target.closest('#btn-prev')) {
        if (_state.currentIndex > 0) { _state.currentIndex--; _renderQuestion(container); }
      }
      if (e.target.id === 'btn-next' || e.target.closest('#btn-next')) {
        if (_state.currentIndex < _state.questions.length - 1) { _state.currentIndex++; _renderQuestion(container); }
      }
      if (e.target.id === 'btn-submit' || e.target.closest('#btn-submit')) {
        _confirmSubmit(container);
      }
      if (e.target.id === 'btn-exit' || e.target.closest('#btn-exit')) {
        if (confirm('পরীক্ষা বন্ধ করবেন? অগ্রগতি হারিয়ে যাবে।')) {
          _cleanup();
          Router.navigate('/exams');
        }
      }
    });
  }

  // ─── Timer ─────────────────────────────────────────────────────────────────

  function _startTimer(container) {
    const display = container.querySelector('#timer-display');
    const timerEl = container.querySelector('#exam-timer');

    _state.timerInterval = setInterval(() => {
      _state.timeLeft--;
      if (display) display.textContent = Utils.formatTime(_state.timeLeft);
      if (timerEl && _state.timeLeft <= 300) timerEl.classList.add('timer--warning');
      if (_state.timeLeft <= 0) {
        _cleanup();
        Utils.warn('সময় শেষ! স্বয়ংক্রিয়ভাবে জমা দেওয়া হচ্ছে।');
        _submit(container);
      }
    }, 1000);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  function _confirmSubmit(container) {
    const unanswered = _state.answers.filter(a => a === -1).length;
    if (unanswered > 0) {
      if (!confirm(`${unanswered}টি প্রশ্নের উত্তর দেননি। তবুও জমা দেবেন?`)) return;
    }
    _submit(container);
  }

  async function _submit(container) {
    if (_state.submitted) return;
    _state.submitted = true;
    _cleanup();

    const submitBtn = container.querySelector('#btn-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'জমা হচ্ছে...'; }

    const duration = Math.round((Date.now() - _state.startTime) / 1000);

    try {
      if (Auth.isLoggedIn()) {
        // Save to server
        const result = await API.Exam.submit(_state.exam.id, {
          answers: _state.answers,
          durationSeconds: duration,
        });
        // Navigate to results page, passing result in state
        sessionStorage.setItem('jft_last_result', JSON.stringify(result));
        Router.navigate('/results');
      } else {
        // Guest: grade client-side via scoring in session storage
        sessionStorage.setItem('jft_guest_answers', JSON.stringify({
          examId: _state.exam.id,
          answers: _state.answers,
          duration,
        }));
        Router.navigate('/results');
      }
    } catch (err) {
      Utils.error(`জমা দিতে সমস্যা হয়েছে: ${err.message}`);
      _state.submitted = false;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function _setStatus(container, _type, msg) {
    const mount = container.querySelector('#question-mount');
    if (mount) mount.innerHTML = `<div class="flex-center" style="padding:80px;flex-direction:column;gap:16px">
      <div class="spinner spinner--lg"></div><p>${Utils.esc(msg)}</p></div>`;
  }

  function _reset() {
    _cleanup();
    _state = { exam: null, questions: [], answers: [], currentIndex: 0, timeLeft: 3600, startTime: null, timerInterval: null, submitted: false };
  }

  function _cleanup() {
    if (_state.timerInterval) { clearInterval(_state.timerInterval); _state.timerInterval = null; }
  }

  return { mount };
})();

window.ExamPage = ExamPage;
