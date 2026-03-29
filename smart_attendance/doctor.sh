#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"

ok() { echo "[OK] $1"; }
warn() { echo "[WARN] $1"; }
err() { echo "[ERR] $1"; }

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

is_port_listening() {
  local port="$1"
  python3 - <<PY
import socket
port = int("$port")
for host in ('127.0.0.1','::1'):
  fam = socket.AF_INET6 if ':' in host else socket.AF_INET
  s = socket.socket(fam, socket.SOCK_STREAM)
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

echo "HPTU Attendance System Doctor"
echo "Project: $ROOT_DIR"
echo

if command -v node >/dev/null 2>&1; then
  ok "Node.js: $(node -v)"
else
  err "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm: $(npm -v)"
else
  err "npm not found"
fi

if command -v python3 >/dev/null 2>&1; then
  ok "Python: $(python3 --version 2>&1)"
else
  warn "python3 not found"
fi

if command -v python >/dev/null 2>&1; then
  ok "python alias found: $(command -v python)"
else
  warn "python alias not found (use python3 commands instead)"
fi

if command -v pip >/dev/null 2>&1; then
  ok "pip alias found: $(command -v pip)"
else
  warn "pip alias not found (use python3 -m pip or pip3)"
fi

if [ -f "$BACKEND_DIR/.env" ]; then
  ok "backend/.env exists"
else
  warn "backend/.env missing (will be created from backend/.env.example)"
fi

if [ -d "$BACKEND_DIR/node_modules" ]; then
  ok "backend dependencies installed"
else
  warn "backend/node_modules missing; run: npm --prefix backend install"
fi

MONGO_URI="$(get_env_value "MONGO_URI" "$ENV_FILE" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$ENV_FILE" || true)"

if [ -z "$MONGO_URI" ]; then
  warn "MONGO_URI missing in backend/.env"
elif is_local_mongo_uri "$MONGO_URI" && python3 - <<'PY'
import socket
for host in ('127.0.0.1','::1'):
    fam = socket.AF_INET6 if ':' in host else socket.AF_INET
    s = socket.socket(fam, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((host, 27017))
        print('up')
        raise SystemExit(0)
    except Exception:
        pass
    finally:
        try: s.close()
        except Exception: pass
raise SystemExit(1)
PY
then
  ok "MongoDB reachable on localhost:27017"
elif is_local_mongo_uri "$MONGO_URI"; then
  if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
    warn "MongoDB not reachable on localhost:27017 (degraded mode enabled)"
    echo "      backend can still start because ALLOW_START_WITHOUT_DB=true"
  else
    warn "MongoDB not reachable on localhost:27017"
    echo "      start with: ./start_mongodb.sh"
  fi
else
  ok "Using remote MongoDB URI from backend/.env"
fi

if curl -fsS http://localhost:5050/api/health >/dev/null 2>&1; then
  ok "Backend API responds at http://localhost:5050/api/health"
else
  warn "Backend API not currently running"
  echo "      start with: npm start"
fi

if is_port_listening 5050; then
  ok "Port 5050 is in use"
else
  warn "Port 5050 is free"
fi

if is_port_listening 8000; then
  ok "Port 8000 is in use"
else
  warn "Port 8000 is free"
fi

if is_port_listening 8001; then
  ok "Port 8001 is in use"
else
  warn "Port 8001 is free"
fi

echo
echo "Recommended flow:"
if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
  echo "  1) npm start"
  echo "  2) open frontend: http://localhost:8000"
  echo "  3) open admin:    http://localhost:8001/login.html"
  echo "  4) optional: start MongoDB for full data APIs"
  echo "  5) python app: npm run py:setup && npm run py:start"
elif [ -z "$MONGO_URI" ] || is_local_mongo_uri "$MONGO_URI"; then
  echo "  1) ./start_mongodb.sh"
  echo "  2) npm start"
  echo "  3) open frontend: http://localhost:8000"
  echo "  4) open admin:    http://localhost:8001/login.html"
  echo "  5) python app: npm run py:setup && npm run py:start"
else
  echo "  1) ensure remote MongoDB URI is valid in backend/.env"
  echo "  2) npm start"
  echo "  3) open frontend: http://localhost:8000"
  echo "  4) open admin:    http://localhost:8001/login.html"
  echo "  5) python app: npm run py:setup && npm run py:start"
fi
