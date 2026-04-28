/**
 * frontend/components/ExamCard.js
 * Renders a single exam card on the exam list page.
 */

const ExamCard = {

  /** @param {object} exam — exam summary from API */
  render(exam) {
    const attempt    = exam.attempt;
    const hasTried   = !!attempt;
    const diffBadge  = {
      'সহজ':   'badge--green',
      'মধ্যম': 'badge--blue',
      'কঠিন':  'badge--red',
    }[exam.difficulty] || 'badge--blue';

    return `
      <div class="card exam-card ${hasTried ? 'exam-card--completed' : ''}"
           data-exam-id="${Utils.esc(exam.id)}"
           role="button" tabindex="0"
           aria-label="${Utils.esc(exam.title)} শুরু করুন">

        <div class="exam-card__num">0${exam.id.slice(-1)}</div>

        <div class="exam-card__title">${Utils.esc(exam.title)}</div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
          <span class="badge ${diffBadge}">${Utils.esc(exam.difficulty)}</span>
          ${hasTried
            ? `<span class="badge ${attempt.passed ? 'badge--solid-green' : 'badge--solid-red'}">
                 ${attempt.passed ? '✓ পাস' : '✗ ফেল'}
               </span>`
            : ''}
        </div>

        <p style="font-size:0.82rem;color:var(--text-muted);margin:8px 0">
          ${Utils.esc(exam.description || '')}
        </p>

        <div class="exam-card__meta">
          <span>📝 ${exam.questionCount}টি প্রশ্ন</span>
          <span>⏱️ ৬০ মিনিট</span>
          <span>🏆 পাস: ২০০/২৫০</span>
          ${hasTried ? `<span>📊 স্কোর: ${attempt.score}</span>` : ''}
        </div>

        <div style="margin-top:16px">
          <button class="btn btn--primary btn--sm exam-card__start-btn"
                  data-exam-id="${Utils.esc(exam.id)}">
            ${hasTried ? '🔄 পুনরায় দিন' : '▶ শুরু করুন'}
          </button>
        </div>
      </div>
    `;
  },

  /** Render a skeleton placeholder while loading */
  skeleton() {
    return `
      <div class="card" style="pointer-events:none">
        <div class="skeleton" style="width:50px;height:48px;margin-bottom:12px"></div>
        <div class="skeleton" style="width:120px;height:20px;margin-bottom:8px"></div>
        <div class="skeleton" style="width:80%;height:14px;margin-bottom:16px"></div>
        <div class="skeleton" style="width:100%;height:36px;border-radius:50px"></div>
      </div>`;
  },
};

window.ExamCard = ExamCard;
