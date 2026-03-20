#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ADMIN_DIR="$ROOT_DIR/admin"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

cleanup_stale_pid_file() {
  local name="$1"
  local file="$PID_DIR/$name.pid"
  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file")"
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$file"
      echo "Removed stale PID file: $name ($pid)"
    fi
  fi
}

get_env_value() {
  local key="$1"
  local file="$2"
  if [ ! -f "$file" ]; then
    return 1
  fi
  grep -E "^${key}=" "$file" | tail -n 1 | sed -E "s/^${key}=//"
}

is_local_mongo_uri() {
  local uri="$1"
  case "$uri" in
    *localhost*|*127.0.0.1*|*::1*) return 0 ;;
    *) return 1 ;;
  esac
}

check_mongo_ready() {
  python3 - <<'PY'
import socket
for host in ("127.0.0.1", "::1"):
  family = socket.AF_INET6 if ":" in host else socket.AF_INET
  s = socket.socket(family, socket.SOCK_STREAM)
  s.settimeout(0.5)
  try:
    s.connect((host, 27017))
    s.close()
    raise SystemExit(0)
  except Exception:
    pass
  finally:
    try:
      s.close()
    except Exception:
      pass
raise SystemExit(1)
PY
}

is_port_listening() {
  local port="$1"
  python3 - <<PY
import socket
port = int("$port")
for host in ("127.0.0.1", "::1"):
  family = socket.AF_INET6 if ":" in host else socket.AF_INET
  s = socket.socket(family, socket.SOCK_STREAM)
  s.settimeout(0.4)
  try:
    s.connect((host, port))
    raise SystemExit(0)
  except Exception:
    pass
  finally:
    try: s.close()
    except Exception: pass
raise SystemExit(1)
PY
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node.js and retry."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js/npm and retry."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 and retry."
  exit 1
fi

cleanup_stale_pid_file backend
cleanup_stale_pid_file frontend
cleanup_stale_pid_file admin

if [ "${START_ALL_RESTART:-false}" = "true" ]; then
  echo "Restart mode enabled (START_ALL_RESTART=true). Stopping existing managed services..."
  "$ROOT_DIR/stop_all.sh" >/dev/null 2>&1 || true
  sleep 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "Created backend/.env from template"
fi

MONGO_URI="$(get_env_value "MONGO_URI" "$BACKEND_DIR/.env" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$BACKEND_DIR/.env" || true)"

if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
  echo "ALLOW_START_WITHOUT_DB=true; skipping MongoDB precheck."
elif [ -z "$MONGO_URI" ] || is_local_mongo_uri "$MONGO_URI"; then
  if ! check_mongo_ready; then
    echo "MongoDB is not running on localhost:27017."
    echo "Start MongoDB first, then re-run ./start_all.sh"
    echo "Example (macOS with Homebrew): brew services start mongodb-community"
    exit 1
  fi
else
  echo "Detected remote MongoDB URI in backend/.env; skipping local MongoDB precheck."
fi

if is_port_listening 5050; then
  echo "Port 5050 is already in use. Stop existing process or change backend PORT."
  echo "Tip: run ./stop_all.sh first, then retry."
  echo "Tip: run START_ALL_RESTART=true ./start_all.sh to auto-restart managed services."
  exit 1
fi

if is_port_listening 8000; then
  echo "Port 8000 is already in use. Stop existing process or change frontend port."
  echo "Tip: run ./stop_all.sh first, then retry."
  echo "Tip: run START_ALL_RESTART=true ./start_all.sh to auto-restart managed services."
  exit 1
fi

if is_port_listening 8001; then
  echo "Port 8001 is already in use. Stop existing process or change admin port."
  echo "Tip: run ./stop_all.sh first, then retry."
  echo "Tip: run START_ALL_RESTART=true ./start_all.sh to auto-restart managed services."
  exit 1
fi

echo "Installing backend dependencies (safe to re-run)..."
npm --prefix "$BACKEND_DIR" install >/dev/null

echo "Starting backend on http://localhost:5050"
node "$BACKEND_DIR/server.js" > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_DIR/backend.pid"

echo "Starting frontend on http://localhost:8000"
python3 -m http.server 8000 --directory "$FRONTEND_DIR" > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"

echo "Starting admin on http://localhost:8001"
python3 -m http.server 8001 --directory "$ADMIN_DIR" > "$LOG_DIR/admin.log" 2>&1 &
ADMIN_PID=$!
echo "$ADMIN_PID" > "$PID_DIR/admin.pid"

sleep 2

if ! curl -fsS http://localhost:5050/api/health >/dev/null 2>&1; then
  echo "Backend failed health check. See logs: $LOG_DIR/backend.log"
  echo "Stopping started services..."
  if [ -f "$PID_DIR/backend.pid" ]; then kill "$(cat "$PID_DIR/backend.pid")" >/dev/null 2>&1 || true; rm -f "$PID_DIR/backend.pid"; fi
  if [ -f "$PID_DIR/frontend.pid" ]; then kill "$(cat "$PID_DIR/frontend.pid")" >/dev/null 2>&1 || true; rm -f "$PID_DIR/frontend.pid"; fi
  if [ -f "$PID_DIR/admin.pid" ]; then kill "$(cat "$PID_DIR/admin.pid")" >/dev/null 2>&1 || true; rm -f "$PID_DIR/admin.pid"; fi
  exit 1
fi

echo ""
echo "Services started:"
echo "- Backend : http://localhost:5050"
echo "- Frontend: http://localhost:8000"
echo "- Admin   : http://localhost:8001"
echo ""
echo "Health check:"
curl -sS http://localhost:5050/api/health || true
echo ""
echo ""
echo "Logs:"
echo "- $LOG_DIR/backend.log"
echo "- $LOG_DIR/frontend.log"
echo "- $LOG_DIR/admin.log"
echo ""
echo "To stop all: ./stop_all.sh"
