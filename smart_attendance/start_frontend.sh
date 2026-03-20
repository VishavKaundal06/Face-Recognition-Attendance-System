#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ADMIN_DIR="$ROOT_DIR/admin"

echo "Starting frontend on http://localhost:8000"
python3 -m http.server 8000 --directory "$FRONTEND_DIR" &
FRONT_PID=$!

echo "Starting admin on http://localhost:8001"
python3 -m http.server 8001 --directory "$ADMIN_DIR" &
ADMIN_PID=$!

echo "Frontend PID: $FRONT_PID"
echo "Admin PID: $ADMIN_PID"
echo "Press Ctrl+C to stop both servers"

trap 'kill "$FRONT_PID" "$ADMIN_PID" 2>/dev/null || true' EXIT
wait
