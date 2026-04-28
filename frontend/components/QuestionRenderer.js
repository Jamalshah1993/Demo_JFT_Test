/**
 * frontend/components/QuestionRenderer.js
 * Renders a question and handles option selection during an exam.
 */

const QuestionRenderer = {

  SECTION_COLORS: {
    '文字・語彙': { tag: 'badge--red',   bg: 'var(--red)' },
    '会話と表現': { tag: 'badge--blue',  bg: 'var(--blue)' },
    '聴解':       { tag: 'badge--green', bg: 'var(--green)' },
    '読解':       { tag: 'badge--amber', bg: 'var(--amber)' },
  },

  OPTION_LETTERS: ['ক', 'খ', 'গ', 'ঘ'],

  /**
   * Render a question card.
   * @param {object}  question       Sanitised question (no correct field)
   * @param {number}  index          0-based question index
   * @param {number}  total          Total questions in exam
   * @param {number}  selectedAnswer Currently selected answer index (-1 = none)
   * @returns {string} HTML string
   */
  render(question, index, total, selectedAnswer = -1) {
    const colors = this.SECTION_COLORS[question.section] || { tag: 'badge--red' };

    return `
      <div class="question-card" id="question-card">
        <div class="question-card__num">প্রশ্ন ${index + 1} / ${total}</div>

        <span class="section-tag badge ${colors.tag} question-card__section-tag">
          ${Utils.esc(question.section)} &nbsp;·&nbsp; ${Utils.esc(question.sectionBn)}
          &nbsp;·&nbsp; ${Utils.esc(question.category)}
        </span>

        <div class="question-card__stem">${Utils.esc(question.question)}</div>

        ${question.jp ? `
          <div class="question-card__context">
            ${Utils.esc(question.jp)}
            ${question.bn ? `<div class="question-card__context-bn">${Utils.esc(question.bn)}</div>` : ''}
          </div>
        ` : (question.bn ? `
          <div class="question-card__context">
            <div class="question-card__context-bn" style="font-style:normal">${Utils.esc(question.bn)}</div>
          </div>
        ` : '')}

        <div class="options" id="options-list">
          ${question.options.map((opt, i) => `
            <button class="option ${selectedAnswer === i ? 'option--selected' : ''}"
                    data-index="${i}"
                    aria-pressed="${selectedAnswer === i}">
              <span class="option__letter">${this.OPTION_LETTERS[i] || i + 1}</span>
              <span>${Utils.esc(opt)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Bind click events on the rendered options.
   * @param {HTMLElement} container
   * @param {function}    onSelect(index)  Called when user picks an option
   */
  bindOptionClicks(container, onSelect) {
    container.querySelectorAll('.option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        // Update visual state immediately (optimistic)
        container.querySelectorAll('.option').forEach(b => {
          b.classList.remove('option--selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('option--selected');
        btn.setAttribute('aria-pressed', 'true');
        onSelect(idx);
      });
    });
  },

  /**
   * Render a question in review mode (correct/wrong highlighted, no interaction).
   * @param {object} result  Question result with selected, correct, explanation, tip
   */
  renderReview(result) {
    const colors = this.SECTION_COLORS[result.section] || { tag: 'badge--red' };

    const optionClass = (i) => {
      if (i === result.correct && i === result.selected) return 'option--correct';
      if (i === result.correct)                           return 'option--correct';
      if (i === result.selected)                          return 'option--wrong';
      return 'option--disabled';
    };

    return `
      <div class="feedback-item ${result.isCorrect ? 'feedback-item--correct' : 'feedback-item--wrong'}">
        <div class="feedback-item__header">
          ${result.isCorrect ? '✅' : '❌'}
          <span style="font-size:0.8rem;color:var(--text-muted)">প্রশ্ন ${result.index + 1} — ${Utils.esc(result.section)}</span>
        </div>

        ${result.jp || result.bn ? `
          <div class="feedback-item__context">
            ${result.jp ? Utils.esc(result.jp) : ''}
            ${result.bn ? `\n[${Utils.esc(result.bn)}]` : ''}
          </div>
        ` : ''}

        <div class="feedback-item__answers">
          <span class="answer-tag answer-tag--correct">
            ✓ সঠিক: ${this.OPTION_LETTERS[result.correct]} ${Utils.esc(result.options[result.correct])}
          </span>
          ${!result.isCorrect ? `
            <span class="answer-tag answer-tag--wrong">
              ✗ আপনি: ${result.selected >= 0
                ? `${this.OPTION_LETTERS[result.selected]} ${Utils.esc(result.options[result.selected])}`
                : 'উত্তর দেননি'}
            </span>
          ` : ''}
        </div>

        ${!result.isCorrect ? `
          <div class="feedback-item__explanation">
            <strong>📝 ব্যাখ্যা:</strong> ${Utils.esc(result.explanation)}
            <div class="feedback-item__tip">
              🎯 <strong>টিপস:</strong> ${Utils.esc(result.tip)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },
};

window.QuestionRenderer = QuestionRenderer;
