#!/bin/bash
# Pomo launcher — double-click this file to start the app.
# Lives inside the pomo/ repo so it works after any clone or move.

# Resolve the directory this script lives in
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# If already running, bring to front
if pgrep -f "electron.*pomo" > /dev/null 2>&1; then
  osascript -e 'tell application "Electron" to activate' 2>/dev/null || true
  exit 0
fi

cd "$APP_DIR" || { echo "Error: could not cd to $APP_DIR"; exit 1; }

# Install deps automatically if missing (e.g. fresh clone)
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

npm start
