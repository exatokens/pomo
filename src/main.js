/**
 * Electron main process for Pomo app.
 * Manages: main window, blocking overlay window, IPC handlers, timer coordination.
 */

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initDB, saveSession, getTodaySessions, getYesterdaySessions, getTodayPomodoroCount } = require('./db');

let mainWindow = null;
let blockingWindow = null;
let currentSession = null; // { startTime, pomodoroNumber }

/**
 * Create the main application window.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Pomo',
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

/**
 * Create the full-screen blocking overlay shown when a pomodoro ends.
 * Stays above all other windows until the user submits accomplishment details.
 */
function createBlockingWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  blockingWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    backgroundColor: '#0d0d1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  blockingWindow.loadFile(path.join(__dirname, 'renderer', 'blocker.html'));
  blockingWindow.setAlwaysOnTop(true, 'screen-saver');
  blockingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  blockingWindow.focus();
}

/**
 * Close and destroy the blocking overlay window.
 */
function closeBlockingWindow() {
  if (blockingWindow && !blockingWindow.isDestroyed()) {
    blockingWindow.close();
    blockingWindow = null;
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/** Renderer requests to start a new pomodoro session. */
ipcMain.on('session-start', (event, data) => {
  currentSession = {
    id: uuidv4(),
    startTime: data.startTime,
    pomodoroNumber: data.pomodoroNumber,
    date: new Date().toISOString().split('T')[0],
  };
});

/** Timer finished — open blocking overlay. */
ipcMain.on('pomodoro-ended', () => {
  createBlockingWindow();
});

/** Blocker window loaded — send session context so it can number the pomodoro. */
ipcMain.handle('get-current-session', () => currentSession);

/**
 * User submitted accomplishment from blocker window.
 * Saves to DB, closes blocker, notifies main window to refresh list.
 */
ipcMain.handle('submit-accomplishment', async (event, form) => {
  if (!currentSession) return { ok: false, error: 'No active session' };

  const session = {
    id: currentSession.id,
    date: currentSession.date,
    start_time: currentSession.startTime,
    end_time: form.endTime,
    pomodoro_number: currentSession.pomodoroNumber,
    type: form.type,
    description: form.description,
    source: form.source,
    topic: form.topic || null,
  };

  try {
    saveSession(session);
    currentSession = null;
    closeBlockingWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sessions-updated');
      mainWindow.focus();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/** Load today's sessions for the main window. */
ipcMain.handle('get-today-sessions', () => getTodaySessions());

/** Load yesterday's sessions for the summary modal. */
ipcMain.handle('get-yesterday-sessions', () => getYesterdaySessions());

/** Get today's completed pomodoro count (for numbering). */
ipcMain.handle('get-today-count', () => getTodayPomodoroCount());

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initDB();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
