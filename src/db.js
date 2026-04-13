/**
 * Database layer for Pomo app.
 * Uses SQLite via better-sqlite3 for local persistent storage.
 * DB file lives at ~/Library/Application Support/pomo/sessions.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db;

/**
 * Initialize the SQLite database, creating tables if they don't exist.
 * @returns {Database} The open database instance.
 */
function initDB() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'sessions.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      pomodoro_number INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('app', 'reading', 'browsing')),
      description TEXT NOT NULL,
      source TEXT NOT NULL,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  return db;
}

/**
 * Save a completed pomodoro session with accomplishment details.
 * @param {Object} session
 * @param {string} session.id - UUID
 * @param {string} session.date - YYYY-MM-DD
 * @param {string} session.start_time - HH:MM
 * @param {string} session.end_time - HH:MM
 * @param {number} session.pomodoro_number
 * @param {string} session.type - 'app' | 'reading' | 'browsing'
 * @param {string} session.description
 * @param {string} session.source - URL, file path, or GitHub link
 * @param {string} [session.topic] - topic for reading/browsing
 * @returns {Object} The inserted row
 */
function saveSession(session) {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, date, start_time, end_time, pomodoro_number, type, description, source, topic)
    VALUES (@id, @date, @start_time, @end_time, @pomodoro_number, @type, @description, @source, @topic)
  `);
  stmt.run(session);
  return session;
}

/**
 * Get all sessions for a specific date.
 * @param {string} date - YYYY-MM-DD
 * @returns {Array<Object>} Sessions ordered by start_time ascending
 */
function getSessionsByDate(date) {
  return db.prepare(`
    SELECT * FROM sessions WHERE date = ? ORDER BY start_time ASC
  `).all(date);
}

/**
 * Get sessions for today.
 * @returns {Array<Object>}
 */
function getTodaySessions() {
  const today = new Date().toISOString().split('T')[0];
  return getSessionsByDate(today);
}

/**
 * Get sessions for yesterday.
 * @returns {Array<Object>}
 */
function getYesterdaySessions() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];
  return getSessionsByDate(yesterday);
}

/**
 * Get the count of pomodoros completed today (for numbering next session).
 * @returns {number}
 */
function getTodayPomodoroCount() {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM sessions WHERE date = ?`).get(today);
  return row ? row.cnt : 0;
}

module.exports = { initDB, saveSession, getSessionsByDate, getTodaySessions, getYesterdaySessions, getTodayPomodoroCount };
