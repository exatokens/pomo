/**
 * Renderer script for the blocking overlay window.
 * Manages form state, validation, and submission to main process.
 * This window cannot be closed without a valid submission.
 */

// ── State ──────────────────────────────────────────────────────────────────────
let selectedType = null;

// ── DOM refs ───────────────────────────────────────────────────────────────────
const typeBtns     = document.querySelectorAll('.type-btn');
const fDescription = document.getElementById('f-description');
const fSource      = document.getElementById('f-source');
const fTopic       = document.getElementById('f-topic');
const fieldTopic   = document.getElementById('field-topic');
const sourceLabel  = document.getElementById('source-label');
const topicLabel   = document.getElementById('topic-label');
const btnSubmit    = document.getElementById('btn-submit');
const errorMsg     = document.getElementById('error-msg');
const sessionBadge = document.getElementById('session-badge');

// ── Source/topic labels per type ───────────────────────────────────────────────
const TYPE_CONFIG = {
  app: {
    sourceLabel: 'App Path or GitHub URL *',
    sourcePlaceholder: '/Applications/MyApp.app or https://github.com/user/repo',
    showTopic: false,
  },
  reading: {
    sourceLabel: 'Article / Book URL *',
    sourcePlaceholder: 'https://... or book title and chapter',
    showTopic: true,
    topicLabel: 'Topic you read about *',
    topicPlaceholder: 'e.g. React Server Components, async patterns',
  },
  browsing: {
    sourceLabel: 'Link or Resource *',
    sourcePlaceholder: 'https://... or resource description',
    showTopic: true,
    topicLabel: 'Topic / Issue being browsed *',
    topicPlaceholder: 'e.g. Debugging CORS issue in Express, researching vector DBs',
  },
};

// ── Type selection ─────────────────────────────────────────────────────────────
/**
 * Handle type button click — updates UI labels and visible fields.
 * @param {string} type - 'app' | 'reading' | 'browsing'
 */
function selectType(type) {
  selectedType = type;
  const cfg = TYPE_CONFIG[type];

  // Update button styles
  typeBtns.forEach(btn => {
    btn.classList.remove('selected', 'selected-reading', 'selected-browsing');
  });
  const activeBtn = document.querySelector(`.type-btn[data-type="${type}"]`);
  if (type === 'app')      activeBtn.classList.add('selected');
  if (type === 'reading')  activeBtn.classList.add('selected-reading');
  if (type === 'browsing') activeBtn.classList.add('selected-browsing');

  // Update source label and placeholder
  sourceLabel.innerHTML = cfg.sourceLabel + ' <span class="req">*</span>';
  fSource.placeholder = cfg.sourcePlaceholder;

  // Show/hide topic field
  if (cfg.showTopic) {
    topicLabel.innerHTML = cfg.topicLabel + ' <span class="req">*</span>';
    fTopic.placeholder = cfg.topicPlaceholder;
    fieldTopic.classList.remove('hidden');
  } else {
    fieldTopic.classList.add('hidden');
    fTopic.value = '';
  }

  clearErrors();
}

typeBtns.forEach(btn => {
  btn.addEventListener('click', () => selectType(btn.dataset.type));
});

// ── Validation ─────────────────────────────────────────────────────────────────
/**
 * Clear all error states from form fields.
 */
function clearErrors() {
  fDescription.classList.remove('error');
  fSource.classList.remove('error');
  fTopic.classList.remove('error');
  errorMsg.classList.add('hidden');
}

/**
 * Validate the form. Returns true if valid, marks errors if not.
 * @returns {boolean}
 */
function validate() {
  clearErrors();
  let valid = true;

  if (!selectedType) {
    errorMsg.textContent = 'Please select a type (App, Reading, or Browsing).';
    errorMsg.classList.remove('hidden');
    return false;
  }

  if (!fDescription.value.trim()) {
    fDescription.classList.add('error');
    valid = false;
  }

  if (!fSource.value.trim()) {
    fSource.classList.add('error');
    valid = false;
  }

  const cfg = TYPE_CONFIG[selectedType];
  if (cfg.showTopic && !fTopic.value.trim()) {
    fTopic.classList.add('error');
    valid = false;
  }

  if (!valid) {
    errorMsg.textContent = 'Please fill in all required fields.';
    errorMsg.classList.remove('hidden');
  }

  return valid;
}

// ── Submit ─────────────────────────────────────────────────────────────────────
btnSubmit.addEventListener('click', async () => {
  if (!validate()) return;

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Saving…';

  const now = new Date();
  const endTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const result = await window.pomo.submitAccomplishment({
    endTime,
    type:        selectedType,
    description: fDescription.value.trim(),
    source:      fSource.value.trim(),
    topic:       fTopic.value.trim() || null,
  });

  if (result.ok) {
    btnSubmit.textContent = '✓ Saved!';
    // Window will be closed by main process
  } else {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Log & Continue →';
    errorMsg.textContent = result.error || 'Something went wrong. Try again.';
    errorMsg.classList.remove('hidden');
  }
});

// ── Disable keyboard shortcuts that could close the window ────────────────────
document.addEventListener('keydown', (e) => {
  // Block Cmd+W, Cmd+Q, Cmd+H, Cmd+M
  if (e.metaKey && ['w', 'q', 'h', 'm'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
  // Allow Enter to submit when focused on last field
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement !== fDescription) {
    btnSubmit.click();
  }
});

// ── Load session info ──────────────────────────────────────────────────────────
async function init() {
  const session = await window.pomo.getCurrentSession();
  if (session) {
    sessionBadge.textContent = `Pomodoro #${session.pomodoroNumber} · Started ${session.startTime}`;
  }
}

init();
