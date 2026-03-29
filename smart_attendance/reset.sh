#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/logs"

echo "Resetting HPTU Attendance System runtime state..."

if [ -x "$ROOT_DIR/stop_all.sh" ]; then
  "$ROOT_DIR/stop_all.sh" || true
fi

rm -f "$PID_DIR"/*.pid 2>/dev/null || true
rm -f "$LOG_DIR"/*.log 2>/dev/null || true

mkdir -p "$PID_DIR" "$LOG_DIR"

echo "Reset complete."
echo "Next steps:"
echo "  1) ./start_mongodb.sh"
echo "  2) npm start"
