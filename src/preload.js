/**
 * Electron preload script — bridges renderer and main process via contextBridge.
 * Exposes only a narrow, typed API to renderer pages.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pomo', {
  // -- Timer / session
  sessionStart:  (data) => ipcRenderer.send('session-start', data),
  pomodoroEnded: ()     => ipcRenderer.send('pomodoro-ended'),

  // -- Blocker window
  getCurrentSession:    ()     => ipcRenderer.invoke('get-current-session'),
  submitAccomplishment: (form) => ipcRenderer.invoke('submit-accomplishment', form),

  // -- Data queries
  getTodaySessions:     () => ipcRenderer.invoke('get-today-sessions'),
  getYesterdaySessions: () => ipcRenderer.invoke('get-yesterday-sessions'),
  getTodayCount:        () => ipcRenderer.invoke('get-today-count'),

  // -- Tray sync (send current timer label to main process)
  trayTick: (label) => ipcRenderer.send('tray-tick', label),

  // -- Events
  onSessionsUpdated: (cb) => ipcRenderer.on('sessions-updated', cb),
});
