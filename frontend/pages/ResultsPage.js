/**
 * frontend/pages/ResultsPage.js
 * Post-exam results page with full question-by-question feedback.
 */

const ResultsPage = (() => {

  async function mount(container) {
    // Try to get result from sessionStorage (server response or guest)
    let result = null;
    const stored = sessionStorage.getItem('jft_last_result');

    if (stored) {
      result = JSON.parse(stored);
    } else {
      // Guest mode: fetch questions and grade client-side
      const guestData = sessionStorage.getItem('jft_guest_answers');
      if (guestData) {
        const { examId, answers, duration } = JSON.parse(guestData);
        // For guest, we still need server grading (it returns explanations)
        // We'll show a login prompt instead
        container.innerHTML = _guestPrompt(examId);
        return;
      }
      Router.navigate('/exams');
      return;
    }

    container.innerHTML = _template(result);
    _bindEvents(container, result);
    sessionStorage.removeItem('jft_last_result');
  }

  function _template(result) {
    const pct    = Math.round((result.correct / result.total) * 100);
    const passed = result.passed;

    return `
      <!-- Results Header -->
      <div class="result-header">
        <div class="container--sm">
          <h2 style="color:#fff;margin-bottom:8px">পরীক্ষার ফলাফল</h2>
          <div class="score-circle">
            <span class="score-circle__num">${result.score}</span>
            <span class="score-circle__label">স্কোর / ২৫০</span>
          </div>
          <div class="result-pass-badge result-pass-badge--${passed ? 'pass' : 'fail'}">
            ${passed ? '✓ পাস! অভিনন্দন!' : '✗ ফেল — আরও চেষ্টা করুন'}
          </div>
          <p style="margin-top:12px;opacity:0.7;font-size:0.85rem">${Utils.esc(result.message)}</p>
        </div>
      </div>

      <!-- Results Body -->
      <div class="section--sm">
        <div class="container--sm">

          <!-- Section Scores -->
          <h3 class="section-title" style="margin-bottom:24px">সেকশন স্কোর</h3>
          <div class="section-scores-grid" id="section-scores"></div>

          <!-- Summary Card -->
          <div class="card" style="margin-bottom:32px" id="summary-card"></div>

          <!-- Per-question feedback -->
          <h3 class="section-title" style="margin-bottom:24px">প্রশ্নভিত্তিক বিশ্লেষণ</h3>
          <div id="question-feedback"></div>

          <!-- Actions -->
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:32px;padding-top:24px;border-top:1px solid var(--border)">
            <button class="btn btn--primary" id="btn-retake">🔄 পুনরায় দিন</button>
            <a href="/exams" class="btn btn--secondary">← পরীক্ষার তালিকা</a>
            ${Auth.isLoggedIn()
              ? `<a href="/dashboard" class="btn btn--ghost">📊 ড্যাশবোর্ড</a>`
              : `<a href="/register" class="btn btn--ghost">💾 ফলাফল সংরক্ষণ করতে নিবন্ধন করুন</a>`}
          </div>

        </div>
      </div>
    `;
  }

  function _renderSectionScores(container, sectionScores) {
    const el = container.querySelector('#section-scores');
    if (!el) return;

    el.innerHTML = Object.entries(sectionScores).map(([sec, data]) => {
      const color = data.pct >= 80 ? 'var(--green)' : data.pct >= 60 ? 'var(--amber)' : 'var(--red)';
      return `
        <div class="section-score-card">
          <div class="section-score-card__section">${Utils.esc(sec)}</div>
          <div class="section-score-card__pct" style="color:${color}">${data.pct}%</div>
          <div class="section-score-card__detail">${data.correct}/${data.total} সঠিক</div>
          <div class="progress-bar-track" style="margin-top:8px">
            <div class="progress-bar-fill" style="width:${data.pct}%;background:${color}"></div>
          </div>
        </div>`;
    }).join('');
  }

  function _renderSummary(container, result) {
    const summaryEl = container.querySelector('#summary-card');
    if (!summaryEl) return;

    const strengths  = result.strengths  || [];
    const weaknesses = result.weaknesses || [];

    summaryEl.innerHTML = `
      <h3 style="font-weight:700;margin-bottom:12px">📊 সামগ্রিক মূল্যায়ন</h3>
      <p>মোট স্কোর: <strong>${result.score}/250</strong> — ${result.correct}/${result.total} সঠিক
         (${Math.round(result.correct/result.total*100)}%)</p>
      ${strengths.length  ? `<p style="color:var(--green);margin-top:8px">✅ <strong>শক্তিশালী:</strong> ${strengths.map(s => Utils.esc(s.sectionBn)).join(', ')}</p>` : ''}
      ${weaknesses.length ? `<p style="color:var(--red);margin-top:6px">❌ <strong>উন্নতি দরকার:</strong> ${weaknesses.map(w => Utils.esc(w.sectionBn)).join(', ')}</p>` : ''}
      <div style="margin-top:16px;padding:14px;background:${result.passed ? 'var(--green-bg)' : 'var(--amber-bg)'};border-radius:10px;font-size:0.875rem;color:${result.passed ? 'var(--green)' : 'var(--amber)'}">
        ${result.passed
          ? '🎉 আসল JFT-Basic পরীক্ষার জন্য আপনি প্রস্তুত! আত্মবিশ্বাসের সাথে যান।'
          : `💪 দুর্বল বিষয়গুলো পড়ুন, তারপর আবার চেষ্টা করুন। আপনি পারবেন!`}
      </div>
    `;
  }

  function _renderFeedback(container, questionResults) {
    const feedbackEl = container.querySelector('#question-feedback');
    if (!feedbackEl) return;

    feedbackEl.innerHTML = questionResults
      .map(r => QuestionRenderer.renderReview(r))
      .join('');
  }

  function _bindEvents(container, result) {
    // Render sub-sections after DOM is ready
    _renderSectionScores(container, result.sectionScores);
    _renderSummary(container, result);
    _renderFeedback(container, result.questionResults);

    container.querySelector('#btn-retake')?.addEventListener('click', () => {
      // Navigate back to the exam (we need to know exam ID)
      // Store exam ID in result
      if (result.examId) Router.navigate(`/exam/${result.examId}`);
      else Router.navigate('/exams');
    });
  }

  function _guestPrompt(examId) {
    return `
      <div class="container--sm section">
        <div class="card" style="text-align:center;padding:48px">
          <div style="font-size:3rem;margin-bottom:16px">💾</div>
          <h2 style="margin-bottom:12px">ফলাফল দেখতে লগইন করুন</h2>
          <p style="margin-bottom:24px">আপনার ফলাফল সার্ভারে সংরক্ষণ করতে এবং বিস্তারিত ফিডব্যাক পেতে একটি অ্যাকাউন্ট তৈরি করুন।</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <a href="/register" class="btn btn--primary">নিবন্ধন করুন</a>
            <a href="/login?redirect=/exam/${Utils.esc(examId)}" class="btn btn--secondary">লগইন করুন</a>
          </div>
        </div>
      </div>`;
  }

  return { mount };
})();

window.ResultsPage = ResultsPage;
