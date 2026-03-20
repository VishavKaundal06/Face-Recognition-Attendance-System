#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/.pids/mongodb.pid"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
    echo "Stopped project MongoDB (PID $PID)"
  else
    echo "MongoDB PID file exists but process is not running"
  fi
  rm -f "$PID_FILE"
  exit 0
fi

echo "No project MongoDB PID file found."
echo "If MongoDB is running as a system service, stop it with your service manager."
