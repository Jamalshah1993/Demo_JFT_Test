/**
 * frontend/pages/DashboardPage.js
 * User dashboard — stats, history, study plan.
 */

const DashboardPage = (() => {

  async function mount(container) {
    if (!Auth.requireAuth()) return;

    container.innerHTML = `
      <div class="section--sm">
        <div class="container">
          <h2 class="section-title">আমার ড্যাশবোর্ড</h2>
          <p class="section-sub">পরীক্ষার ইতিহাস, স্কোর বিশ্লেষণ, এবং পড়াশোনার পরিকল্পনা</p>
          <div class="flex-center" style="padding:60px">
            <div class="spinner spinner--lg"></div>
          </div>
        </div>
      </div>`;

    try {
      const data = await API.Progress.dashboard();
      container.innerHTML = _template(data);
      _renderHistory(container, data.history);
      _bindEvents(container);
    } catch (err) {
      Utils.error(`ড্যাশবোর্ড লোড হয়নি: ${err.message}`);
    }
  }

  function _template(data) {
    const s = data.stats;
    return `
      <div class="section--sm">
        <div class="container">
          <div class="flex-between" style="margin-bottom:8px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 class="section-title">আমার ড্যাশবোর্ড</h2>
              <p class="section-sub" style="margin-top:8px;margin-bottom:0">আপনার অগ্রগতি ও পরিকল্পনা</p>
            </div>
            <button class="btn btn--ghost btn--sm" id="btn-clear-data">🗑️ ডেটা মুছুন</button>
          </div>

          <!-- Stats Row -->
          <div class="grid-4" style="margin-bottom:var(--sp-8)">
            <div class="stat-card">
              <span class="stat-card__num">${s.attempted}</span>
              <span class="stat-card__label">মোট পরীক্ষা</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__num">${s.avg || '—'}</span>
              <span class="stat-card__label">গড় স্কোর</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__num">${s.best || '—'}</span>
              <span class="stat-card__label">সেরা স্কোর</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__num">${s.passed}</span>
              <span class="stat-card__label">পাস হয়েছে</span>
            </div>
          </div>

          <div class="dashboard-grid">
            <!-- Left: History -->
            <div>
              <h3 style="font-weight:700;margin-bottom:16px">📋 পরীক্ষার ইতিহাস</h3>
              <div class="history-list" id="history-list">
                <div class="flex-center" style="padding:40px">
                  <div class="spinner"></div>
                </div>
              </div>
            </div>

            <!-- Right: Study Plan -->
            <div>
              <h3 style="font-weight:700;margin-bottom:16px">📅 ৪ সপ্তাহের পড়াশোনার পরিকল্পনা</h3>
              ${_studyPlan()}
            </div>
          </div>
        </div>
      </div>`;
  }

  function _renderHistory(container, history) {
    const el = container.querySelector('#history-list');
    if (!el) return;

    if (!history || history.length === 0) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <div class="empty-state__title">এখনো কোনো পরীক্ষা দেননি</div>
        <a href="/exams" class="btn btn--primary" style="margin-top:16px;display:inline-flex">পরীক্ষা শুরু করুন →</a>
      </div>`;
      return;
    }

    el.innerHTML = history.map(attempt => `
      <div class="history-item">
        <div class="history-item__left">
          <div class="history-item__title">${Utils.esc(attempt.examTitle)}</div>
          <div class="history-item__meta">
            ${Utils.formatDate(attempt.completedAt)} &nbsp;·&nbsp;
            ${attempt.correct}/${attempt.total} সঠিক
          </div>
        </div>
        <div class="history-item__right">
          <span class="history-item__score">${attempt.score}</span>
          <span class="badge ${attempt.passed ? 'badge--solid-green' : 'badge--solid-red'}">
            ${attempt.passed ? '✓ পাস' : '✗ ফেল'}
          </span>
          <button class="btn btn--ghost btn--sm" data-attempt-id="${Utils.esc(attempt.id)}">বিস্তারিত</button>
        </div>
      </div>
    `).join('');
  }

  function _studyPlan() {
    const weeks = [
      {
        label: 'সপ্তাহ ১: মৌলিক ভিত্তি',
        tasks: [
          { icon: '📖', text: 'হিরাগানা ও কাতাকানা সম্পূর্ণ শিখুন (প্রতিদিন ৩০ মিনিট)' },
          { icon: '📝', text: 'IRODORI স্তর A1 ইউনিট ১-৩ সম্পন্ন করুন' },
          { icon: '🎧', text: 'দৈনন্দিন জাপানি কথোপকথন ভিডিও দেখুন' },
          { icon: '✏️', text: 'মক টেস্ট ১ দিন এবং ভুলগুলো বিশ্লেষণ করুন' },
        ],
      },
      {
        label: 'সপ্তাহ ২: শব্দভাণ্ডার ও ব্যাকরণ',
        tasks: [
          { icon: '📚', text: 'প্রতিদিন ২০টি নতুন শব্দ শিখুন (কাজের পরিবেশের শব্দ আগে)' },
          { icon: '🔤', text: 'মৌলিক কাঞ্জি শিখুন (水, 火, 食, 駅, 病 ইত্যাদি)' },
          { icon: '💬', text: 'て-form, ます-form, ている অভ্যাস করুন' },
          { icon: '✏️', text: 'মক টেস্ট ২ ও ৩ দিন' },
        ],
      },
      {
        label: 'সপ্তাহ ৩: পাঠ বোধ ও শ্রবণ',
        tasks: [
          { icon: '📰', text: 'সহজ জাপানি বিজ্ঞাপন, নোটিশ পড়ার অভ্যাস করুন' },
          { icon: '🎵', text: 'NHK World Easy Japanese শুনুন' },
          { icon: '🏪', text: 'দোকান, হাসপাতাল, অফিসের কথোপকথন অনুশীলন করুন' },
          { icon: '✏️', text: 'মক টেস্ট ৪ দিন এবং সময় ব্যবস্থাপনা লক্ষ্য করুন' },
        ],
      },
      {
        label: 'সপ্তাহ ৪: চূড়ান্ত প্রস্তুতি',
        tasks: [
          { icon: '🔄', text: 'সব মক টেস্ট আবার দিন এবং উন্নতি দেখুন' },
          { icon: '❌', text: 'দুর্বল বিষয়গুলোতে বিশেষ মনোযোগ দিন' },
          { icon: '⏰', text: '৬০ মিনিটে সব প্রশ্ন শেষ করার অভ্যাস করুন' },
          { icon: '🎯', text: 'পরীক্ষার দিনের জন্য মানসিকভাবে প্রস্তুত থাকুন' },
        ],
      },
    ];

    return `<div class="study-plan">${weeks.map(week => `
      <div>
        <div class="study-week__label">📅 ${Utils.esc(week.label)}</div>
        <div class="study-week__tasks">
          ${week.tasks.map(t => `
            <div class="study-task">
              <span class="study-task__icon">${t.icon}</span>
              <span>${Utils.esc(t.text)}</span>
            </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>`;
  }

  function _bindEvents(container) {
    container.querySelector('#btn-clear-data')?.addEventListener('click', async () => {
      if (!confirm('সব পরীক্ষার ডেটা মুছে ফেলবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।')) return;
      Utils.info('ডেটা মুছার ফিচার শীঘ্রই আসছে।');
    });

    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-attempt-id]');
      if (!btn) return;
      const attemptId = btn.dataset.attemptId;
      try {
        const data = await API.Progress.attempt(attemptId);
        sessionStorage.setItem('jft_last_result', JSON.stringify({
          ...data.attempt,
          questionResults: data.questionResults,
        }));
        Router.navigate('/results');
      } catch (err) {
        Utils.error('ফলাফল লোড হয়নি।');
      }
    });
  }

  return { mount };
})();

window.DashboardPage = DashboardPage;
