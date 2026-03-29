#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_by_port() {
  local name="$1"
  local port="$2"

  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi

  local pids
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "$pids" | while read -r pid; do
      if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
        kill "$pid" >/dev/null 2>&1 || true
        echo "Stopped $name via port $port (PID $pid)"
      fi
    done
  fi
}

stop_pid_file() {
  local name="$1"
  local port="$2"
  local file="$PID_DIR/$name.pid"

  local stopped_by_pid=false

  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      echo "Stopped $name (PID $pid)"
      stopped_by_pid=true
    else
      echo "$name already stopped"
    fi
    rm -f "$file"
  else
    echo "No PID file for $name"
  fi

  if [ "$stopped_by_pid" = false ]; then
    stop_by_port "$name" "$port"
  fi
}

stop_pid_file "backend" "5050"
stop_pid_file "frontend" "8000"
stop_pid_file "admin" "8001"
stop_pid_file "portal" "8002"
