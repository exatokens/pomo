/**
 * JSON-file storage layer for Pomo app.
 * Persists sessions to ~/Library/Application Support/pomo/sessions.json
 * All reads/writes are synchronous to keep IPC handlers simple.
 */

const fs   = require('fs');
const path = require('path');
const { app } = require('electron');

let dataPath;
let sessions = [];   // in-memory array, flushed to disk on every write

/**
 * Initialize storage — load existing data or create empty store.
 */
function initDB() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  dataPath = path.join(userDataPath, 'sessions.json');

  if (fs.existsSync(dataPath)) {
    try {
      sessions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch {
      sessions = [];
    }
  } else {
    sessions = [];
    flush();
  }
}

/**
 * Write current in-memory sessions array to disk.
 */
function flush() {
  fs.writeFileSync(dataPath, JSON.stringify(sessions, null, 2), 'utf8');
}

/**
 * Save a completed pomodoro session.
 * @param {Object} session
 * @param {string} session.id
 * @param {string} session.date          - YYYY-MM-DD
 * @param {string} session.start_time    - HH:MM
 * @param {string} session.end_time      - HH:MM
 * @param {number} session.pomodoro_number
 * @param {string} session.type          - 'app' | 'reading' | 'browsing'
 * @param {string} session.description
 * @param {string} session.source
 * @param {string|null} session.topic
 * @returns {Object} The saved session
 */
function saveSession(session) {
  session.created_at = new Date().toISOString();
  sessions.push(session);
  flush();
  return session;
}

/**
 * Get all sessions for a given date, sorted by start_time ascending.
 * @param {string} date - YYYY-MM-DD
 * @returns {Array<Object>}
 */
function getSessionsByDate(date) {
  return sessions
    .filter(s => s.date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/**
 * Get sessions for today.
 * @returns {Array<Object>}
 */
function getTodaySessions() {
  return getSessionsByDate(today());
}

/**
 * Get sessions for yesterday.
 * @returns {Array<Object>}
 */
function getYesterdaySessions() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getSessionsByDate(d.toISOString().split('T')[0]);
}

/**
 * Count of pomodoros completed today.
 * @returns {number}
 */
function getTodayPomodoroCount() {
  return sessions.filter(s => s.date === today()).length;
}

/** @returns {string} Today as YYYY-MM-DD */
function today() {
  return new Date().toISOString().split('T')[0];
}

module.exports = { initDB, saveSession, getSessionsByDate, getTodaySessions, getYesterdaySessions, getTodayPomodoroCount };
