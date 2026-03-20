#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

echo "MongoDB Doctor"
echo "-------------"

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

resolve_brew() {
  if command -v brew >/dev/null 2>&1; then
    command -v brew
    return 0
  fi

  if [ -x "/opt/homebrew/bin/brew" ]; then
    echo "/opt/homebrew/bin/brew"
    return 0
  fi

  if [ -x "/usr/local/bin/brew" ]; then
    echo "/usr/local/bin/brew"
    return 0
  fi

  return 1
}

BREW_BIN=""
if BREW_BIN="$(resolve_brew 2>/dev/null)"; then
  echo "[OK] Homebrew found: $BREW_BIN"
  echo "     $($BREW_BIN --version | head -n 1)"

  if ! command -v brew >/dev/null 2>&1; then
    echo "[WARN] brew is installed but not in PATH"
    echo "      Add to shell profile (~/.zprofile or ~/.zshrc):"
    echo "      export PATH=\"$(dirname "$BREW_BIN"):\$PATH\""
  fi
else
  echo "[WARN] Homebrew not found in PATH"
  echo "      Install Homebrew from https://brew.sh and reopen terminal"
fi

MONGO_URI="$(get_env_value "MONGO_URI" "$ENV_FILE" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$ENV_FILE" || true)"

if [ -z "$MONGO_URI" ]; then
  echo "[WARN] backend/.env MONGO_URI missing"
else
  echo "[OK] backend/.env MONGO_URI detected"
  if is_local_mongo_uri "$MONGO_URI"; then
    echo "     mode: local MongoDB expected"
  else
    echo "     mode: remote MongoDB URI"

    if [ -d "$ROOT_DIR/backend/node_modules" ]; then
      if (
        cd "$ROOT_DIR/backend"
        MONGO_URI="$MONGO_URI" node - <<'JS'
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('[WARN] Remote connectivity probe skipped (MONGO_URI missing)');
    process.exit(0);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
    console.log('[OK] Remote MongoDB connectivity probe succeeded');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.log('[WARN] Remote MongoDB connectivity probe failed');
    console.log(`      ${error.message}`);
    process.exit(0);
  }
}

run();
JS
      ); then
        :
      fi
    else
      echo "[WARN] backend/node_modules missing; skipping remote connectivity probe"
      echo "      Run: npm --prefix backend install"
    fi
  fi
fi

if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
  echo "[WARN] ALLOW_START_WITHOUT_DB=true (degraded backend startup enabled)"
fi

if command -v mongod >/dev/null 2>&1; then
  echo "[OK] mongod binary found: $(command -v mongod)"
else
  echo "[WARN] mongod not found"
  echo "      Install MongoDB community edition (macOS):"
  echo "      brew tap mongodb/brew"
  echo "      brew install mongodb-community"
fi

if command -v mongosh >/dev/null 2>&1; then
  echo "[OK] mongosh found: $(command -v mongosh)"
else
  echo "[WARN] mongosh not found (optional)"
fi

python3 - <<'PY'
import socket
ok=False
for host in ('127.0.0.1','::1'):
    fam = socket.AF_INET6 if ':' in host else socket.AF_INET
    s = socket.socket(fam, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((host, 27017))
        ok=True
        break
    except Exception:
        pass
    finally:
        try: s.close()
        except Exception: pass
if ok:
    print('[OK] MongoDB is reachable on localhost:27017')
else:
    print('[WARN] MongoDB is not reachable on localhost:27017')
PY

echo
if [ -n "$MONGO_URI" ] && ! is_local_mongo_uri "$MONGO_URI"; then
  echo "Local MongoDB is optional because backend is configured for remote MongoDB."
  echo "Validate remote connectivity by running: npm run doctor"
  echo "If you still want local MongoDB, run: npm run mongo:start"
elif [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
  echo "Backend can start without MongoDB because ALLOW_START_WITHOUT_DB=true."
  echo "For full DB features, start local MongoDB: npm run mongo:start"
elif [ -n "$BREW_BIN" ]; then
  echo "Try: npm run mongo:start"
else
  echo "After installing Homebrew and MongoDB, run: npm run mongo:start"
fi
