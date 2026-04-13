/**
 * Main renderer script for Pomo app.
 * Handles: timer logic, Pomodoro phase management, accomplishment list rendering,
 * detail panel, and yesterday's summary modal.
 */

// ── Constants ──────────────────────────────────────────────────────────────────
const PHASES = {
  FOCUS:     { label: 'Focus',      seconds: 35 * 60, ring: '',             phase: 'focus' },
  SHORT:     { label: 'Short Break',seconds: 5  * 60, ring: 'break-ring',   phase: 'break' },
  LONG:      { label: 'Long Break', seconds: 15 * 60, ring: 'longbreak-ring',phase: 'longbreak' },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 100; // r=100 → 628.3

// ── State ──────────────────────────────────────────────────────────────────────
let timerInterval = null;
let secondsLeft   = PHASES.FOCUS.seconds;
let currentPhase  = PHASES.FOCUS;
let isRunning     = false;
let pomodoroInCycle = 0;   // 0–3 completed in current cycle of 4
let totalToday    = 0;     // from DB on load
let sessionStartTime = null;
let selectedRow   = null;

// ── DOM refs ───────────────────────────────────────────────────────────────────
const timerDisplay  = document.getElementById('timer-display');
const phaseLabel    = document.getElementById('phase-label');
const ringProgress  = document.getElementById('ring-progress');
const btnStart      = document.getElementById('btn-start');
const btnReset      = document.getElementById('btn-reset');
const btnSkip       = document.getElementById('btn-skip');
const dotsWrap      = document.getElementById('pomodoro-dots');
const sessionNum    = document.getElementById('session-num');
const accList       = document.getElementById('acc-list');
const emptyState    = document.getElementById('empty-state');
const accDetail     = document.getElementById('acc-detail');
const detailClose   = document.getElementById('detail-close');
const dateLabel     = document.getElementById('date-label');

// ── Helpers ────────────────────────────────────────────────────────────────────
/**
 * Format seconds into MM:SS string.
 * @param {number} s - Total seconds
 * @returns {string}
 */
function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

/**
 * Get current time as HH:MM string.
 * @returns {string}
 */
function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Update the SVG ring progress arc.
 * @param {number} secondsLeft
 * @param {number} totalSeconds
 */
function updateRing(secondsLeft, totalSeconds) {
  const fraction = secondsLeft / totalSeconds;
  const offset   = RING_CIRCUMFERENCE * (1 - fraction);
  ringProgress.style.strokeDashoffset = offset;
}

/**
 * Update the four pomodoro cycle dots.
 * @param {number} done - Completed count (0–4)
 * @param {boolean} activeNow - Whether a focus session is in progress
 */
function updateDots(done, activeNow) {
  const dots = dotsWrap.querySelectorAll('.dot');
  dots.forEach((d, i) => {
    d.className = 'dot';
    if (i < done) d.classList.add('done');
    else if (i === done && activeNow) d.classList.add('active');
  });
}

/**
 * Switch to a new Pomodoro phase (focus / short break / long break).
 * @param {Object} phase - One of PHASES.*
 */
function switchPhase(phase) {
  currentPhase = phase;
  secondsLeft  = phase.seconds;

  timerDisplay.textContent = fmt(secondsLeft);
  phaseLabel.textContent   = phase.label;
  phaseLabel.className     = `phase-label ${phase.phase}`;

  ringProgress.className  = `ring-progress ${phase.ring}`;
  ringProgress.style.strokeDashoffset = 0;

  isRunning = false;
  btnStart.textContent = 'Start';

  // Hide skip button during focus; show during breaks
  btnSkip.style.display = (phase === PHASES.FOCUS) ? 'none' : 'flex';
}

// ── Timer ──────────────────────────────────────────────────────────────────────
/**
 * Tick the timer down by one second. Handles phase completion.
 */
function tick() {
  secondsLeft--;
  timerDisplay.textContent = fmt(secondsLeft);
  updateRing(secondsLeft, currentPhase.seconds);

  if (secondsLeft <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    if (currentPhase === PHASES.FOCUS) {
      onFocusComplete();
    } else {
      onBreakComplete();
    }
  }
}

/**
 * Called when a 35-minute focus session ends.
 * Notifies main process to open the blocking overlay.
 */
function onFocusComplete() {
  pomodoroInCycle++;
  totalToday++;

  // Tell main process so it can open the blocker
  window.pomo.pomodoroEnded();
}

/**
 * Called when a break phase timer ends. Automatically returns to focus.
 */
function onBreakComplete() {
  switchPhase(PHASES.FOCUS);
  updateDots(pomodoroInCycle % 4, false);
  sessionNum.textContent = totalToday + 1;
}

// ── Controls ───────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', () => {
  if (currentPhase !== PHASES.FOCUS) return; // during breaks, timer auto-starts

  if (isRunning) {
    // Pause
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    btnStart.textContent = 'Resume';
    updateDots(pomodoroInCycle % 4, false);
  } else {
    // Start / Resume
    if (!sessionStartTime) {
      sessionStartTime = nowTime();
      window.pomo.sessionStart({
        startTime: sessionStartTime,
        pomodoroNumber: totalToday + 1,
      });
    }
    isRunning = true;
    btnStart.textContent = 'Pause';
    updateDots(pomodoroInCycle % 4, true);
    timerInterval = setInterval(tick, 1000);
  }
});

btnReset.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval  = null;
  isRunning      = false;
  sessionStartTime = null;
  switchPhase(PHASES.FOCUS);
  updateDots(pomodoroInCycle % 4, false);
  btnStart.textContent = 'Start';
});

btnSkip.addEventListener('click', () => {
  // Skip break → go straight to focus
  clearInterval(timerInterval);
  timerInterval = null;
  switchPhase(PHASES.FOCUS);
  updateDots(pomodoroInCycle % 4, false);
  sessionNum.textContent = totalToday + 1;
});

// ── Sessions updated (after blocker submits) ───────────────────────────────────
window.pomo.onSessionsUpdated(async () => {
  sessionStartTime = null;
  btnStart.textContent = 'Start';

  // Start break phase
  const isLongBreak = pomodoroInCycle % 4 === 0;
  const nextPhase = isLongBreak ? PHASES.LONG : PHASES.SHORT;
  switchPhase(nextPhase);
  updateDots(pomodoroInCycle % 4, false);
  sessionNum.textContent = totalToday + 1;

  // Auto-start break countdown
  setTimeout(() => {
    isRunning = true;
    timerInterval = setInterval(tick, 1000);
  }, 500);

  await loadTodaySessions();
});

// ── Accomplishments list ───────────────────────────────────────────────────────
/**
 * Render a single accomplishment row in the list.
 * @param {Object} session - DB session row
 * @returns {HTMLElement}
 */
function makeRow(session) {
  const row = document.createElement('div');
  row.className = 'acc-row';
  row.dataset.id = session.id;

  const typeLabels = { app: 'APP', reading: 'READ', browsing: 'WEB' };

  row.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:2px;width:52px;flex-shrink:0">
      <div class="acc-num">P${session.pomodoro_number}</div>
      <div class="acc-time">${session.start_time}</div>
    </div>
    <div class="acc-row-left" style="flex:1;min-width:0">
      <div class="acc-desc" title="${session.description}">${session.description}</div>
      <div class="acc-source-preview">${session.source}</div>
    </div>
    <div class="type-badge ${session.type}">${typeLabels[session.type] || session.type}</div>
  `;

  row.addEventListener('click', () => showDetail(session, row));
  return row;
}

/**
 * Load today's sessions from DB and re-render the list.
 */
async function loadTodaySessions() {
  const sessions = await window.pomo.getTodaySessions();

  // Clear list (keep empty state node)
  Array.from(accList.children).forEach(c => {
    if (c !== emptyState) c.remove();
  });
  selectedRow = null;
  accDetail.classList.add('hidden');

  if (!sessions || sessions.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  sessions.forEach(s => accList.appendChild(makeRow(s)));
}

// ── Detail panel ───────────────────────────────────────────────────────────────
/**
 * Show the detail panel for a clicked session row.
 * @param {Object} session
 * @param {HTMLElement} rowEl
 */
function showDetail(session, rowEl) {
  if (selectedRow) selectedRow.classList.remove('selected');
  selectedRow = rowEl;
  rowEl.classList.add('selected');

  const typeLabels = { app: 'App', reading: 'Reading', browsing: 'Browsing' };

  document.getElementById('detail-type').textContent  = typeLabels[session.type] || session.type;
  document.getElementById('detail-type').className    = `detail-type-badge ${session.type}`;
  document.getElementById('detail-title').textContent = session.description;
  document.getElementById('detail-meta').textContent  =
    `Pomodoro #${session.pomodoro_number} · ${session.start_time} – ${session.end_time}`;

  const srcEl = document.getElementById('detail-source');
  srcEl.textContent = session.source;
  if (session.source.startsWith('http')) {
    srcEl.href = session.source;
    srcEl.style.cursor = 'pointer';
  } else {
    srcEl.removeAttribute('href');
    srcEl.style.cursor = 'default';
  }

  const topicWrap = document.getElementById('detail-topic-wrap');
  if (session.topic) {
    document.getElementById('detail-topic').textContent = session.topic;
    topicWrap.classList.remove('hidden');
  } else {
    topicWrap.classList.add('hidden');
  }

  document.getElementById('detail-time').textContent = `${session.start_time} → ${session.end_time}`;

  accDetail.classList.remove('hidden');
}

detailClose.addEventListener('click', () => {
  accDetail.classList.add('hidden');
  if (selectedRow) selectedRow.classList.remove('selected');
  selectedRow = null;
});

// ── Yesterday modal ────────────────────────────────────────────────────────────
/**
 * Show yesterday's accomplishment summary modal if any sessions exist.
 */
async function maybeShowYesterdayModal() {
  const sessions = await window.pomo.getYesterdaySessions();
  if (!sessions || sessions.length === 0) return;

  const list = document.getElementById('yesterday-list');
  list.innerHTML = '';

  sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'yesterday-item';
    item.innerHTML = `
      <div class="y-num">Pomodoro #${s.pomodoro_number}</div>
      <div class="y-desc">${s.description}</div>
      <div class="y-source">${s.source}${s.topic ? ' · ' + s.topic : ''}</div>
      <div class="y-time">${s.start_time} – ${s.end_time}</div>
    `;
    list.appendChild(item);
  });

  document.getElementById('yesterday-modal').classList.remove('hidden');
}

document.getElementById('close-yesterday').addEventListener('click', () => {
  document.getElementById('yesterday-modal').classList.add('hidden');
});

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  // Set date label
  dateLabel.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  // Load completed count for today (in case app was restarted)
  totalToday = await window.pomo.getTodayCount();
  pomodoroInCycle = totalToday % 4;
  sessionNum.textContent = totalToday + 1;
  updateDots(pomodoroInCycle, false);

  // Init ring
  updateRing(PHASES.FOCUS.seconds, PHASES.FOCUS.seconds);
  btnSkip.style.display = 'none';

  // Load sessions
  await loadTodaySessions();

  // Show yesterday modal
  await maybeShowYesterdayModal();
}

init();
