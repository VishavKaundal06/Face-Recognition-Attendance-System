#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

echo "Smart Attendance Setup"
echo "----------------------"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node.js first."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js/npm first."
  exit 1
fi

mkdir -p "$ROOT_DIR/logs" "$ROOT_DIR/.pids"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "Created backend/.env from template"
else
  echo "backend/.env already exists"
fi

echo "Installing backend dependencies..."
npm --prefix "$BACKEND_DIR" install

echo "Running doctor checks..."
"$ROOT_DIR/doctor.sh" || true

echo
echo "Setup complete."
echo "Next:"
echo "  1) npm run mongo:start"
echo "  2) npm start"
