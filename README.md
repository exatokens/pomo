# 🍅 Pomo

A modified Pomodoro timer for Mac with forced accomplishment logging.  
**35-minute focus sessions** — you cannot move on until you log what you did.

---

## What it does

| Feature | Detail |
|---|---|
| **35-min focus timer** | Longer than standard Pomodoro — optimised for deep work |
| **Blocking overlay** | Full-screen lock after every session. No way past it without logging |
| **Accomplishment log** | Tracks what you did, with source: app path, article link, or browsing context |
| **Menu bar icon** | Lives as `🍅` in your Mac menu bar — always accessible, never in the way |
| **Yesterday summary** | On first launch of the day, shows everything you completed yesterday |
| **Cycle tracking** | 4 pomodoros → long break (5 min short / 15 min long) |
| **Detail panel** | Click any log entry to expand full details on the right |

---

## Requirements

- macOS 11 (Big Sur) or later
- [Node.js](https://nodejs.org) v16 or later — install via the website or:
  ```bash
  brew install node
  ```

---

## Install on a fresh Mac

```bash
# 1. Clone the repo
git clone https://github.com/exatokens/pomo.git ~/Desktop/pomo

# 2. Install dependencies
cd ~/Desktop/pomo
npm install

# 3. Launch
npm start
```

After the first `npm install`, you can launch by **double-clicking `pomo.command`** — no terminal needed.

---

## Launch (day-to-day)

Double-click **`pomo.command`** inside the `pomo/` folder.

- If the app is already running it brings the window to front.
- If `node_modules` is missing (fresh clone) it runs `npm install` automatically before starting.

### Auto-start on login

System Settings → General → Login Items → **+** → select `pomo.command` → Add.

---

## How the Pomodoro cycle works

```
[35 min Focus] → LOG ENTRY REQUIRED → [5 min Break]
[35 min Focus] → LOG ENTRY REQUIRED → [5 min Break]
[35 min Focus] → LOG ENTRY REQUIRED → [5 min Break]
[35 min Focus] → LOG ENTRY REQUIRED → [15 min Long Break]
↑ repeat
```

During the **blocking overlay** you must choose a type and fill in all fields.  
Keyboard shortcuts (Cmd+W, Cmd+Q, Cmd+H) are disabled until you submit.

### Log entry types

| Type | Required fields |
|---|---|
| **App** | What you did + Mac app path or GitHub URL |
| **Reading** | What you did + article/book URL + topic |
| **Browsing** | What you did + link + topic / issue being investigated |

---

## Menu bar

| Action | Result |
|---|---|
| Click `🍅` | Show / hide the main window |
| Right-click `🍅` | Context menu — show window, quit |
| While timer runs | Label updates live: `🍅 34:12  Focus` |

---

## Data storage

All sessions are saved locally at:

```
~/Library/Application Support/pomo/sessions.json
```

No cloud sync, no account needed. To back up your history, copy that file.

---

## Project structure

```
pomo/
├── pomo.command          # Double-click launcher for macOS
├── package.json
├── assets/
│   └── tray.png          # Menu bar icon
└── src/
    ├── main.js           # Electron main process (windows, tray, IPC)
    ├── preload.js        # Secure bridge between main and renderer
    ├── db.js             # JSON file storage layer
    └── renderer/
        ├── index.html    # Main UI
        ├── style.css
        ├── app.js        # Timer logic, accomplishment list
        ├── blocker.html  # Full-screen blocking overlay
        ├── blocker.css
        └── blocker.js    # Overlay form + validation
```

---

## Development

```bash
npm start        # Run the app
git push         # Push changes to GitHub
```
