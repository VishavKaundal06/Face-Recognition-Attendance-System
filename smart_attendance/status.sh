#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
ENV_FILE="$ROOT_DIR/backend/.env"

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

check_pid() {
  local name="$1"
  local file="$PID_DIR/$name.pid"
  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "$name: running (PID $pid)"
    else
      echo "$name: stale pid file ($pid not running)"
    fi
  else
    echo "$name: no pid file"
  fi
}

echo "Smart Attendance Status"
echo "------------------------"
check_pid backend
check_pid frontend
check_pid admin
check_pid mongodb

echo
echo "Port checks"
if is_port_listening 5050; then echo "5050: in use"; else echo "5050: free"; fi
if is_port_listening 8000; then echo "8000: in use"; else echo "8000: free"; fi
if is_port_listening 8001; then echo "8001: in use"; else echo "8001: free"; fi

echo
echo "URLs"
echo "Backend health: http://localhost:5050/api/health"
echo "Frontend:       http://localhost:8000"
echo "Admin login:    http://localhost:8001/login.html"

echo
echo "Configuration"
MONGO_URI="$(get_env_value "MONGO_URI" "$ENV_FILE" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$ENV_FILE" || true)"

if [ -z "$MONGO_URI" ]; then
  echo "MONGO_URI:      missing"
elif is_local_mongo_uri "$MONGO_URI"; then
  echo "MONGO_URI:      local"
else
  echo "MONGO_URI:      remote"
fi

if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
  echo "Degraded mode:  enabled"
else
  echo "Degraded mode:  disabled"
fi

echo
echo "Health snapshot"
HEALTH_JSON="$(curl -sS http://localhost:5050/api/health 2>/dev/null || true)"
if [ -z "$HEALTH_JSON" ]; then
  echo "backend: unreachable"
else
  python3 - <<'PY' "$HEALTH_JSON"
import json,sys
raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    print(f"backend: reachable (unparsed response: {raw[:120]})")
    raise SystemExit(0)

status = data.get('status', 'unknown')
mongo = data.get('mongodb', 'unknown')
degraded = data.get('degraded', False)
print(f"backend: {status}")
print(f"mongodb: {mongo}")
print(f"degraded: {'yes' if degraded else 'no'}")
PY
fi

echo
echo "Next"
echo "- Run full check: npm run ready"
echo "- Mongo diagnostics: npm run mongo:doctor"
