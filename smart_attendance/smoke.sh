#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_URL="${SMOKE_BASE_URL:-http://localhost:5050/api}"

echo "Smart Attendance Smoke Test"
echo "Base URL: $BASE_URL"

echo "1) Health check..."
HEALTH_JSON="$(curl -fsS "$BASE_URL/health" 2>/dev/null || true)"
if [ -z "$HEALTH_JSON" ]; then
  echo "[FAIL] Backend health endpoint is not reachable."
  echo "Start MongoDB and backend first: npm run mongo:start && npm start"
  exit 1
fi
echo "[OK] Health check passed"

HEALTH_DEGRADED="$(python3 - <<'PY' "$HEALTH_JSON"
import json,sys
try:
    data=json.loads(sys.argv[1])
    print('true' if data.get('degraded') else 'false')
except Exception:
    print('false')
PY
)"

if [ "$HEALTH_DEGRADED" = "true" ]; then
  echo "[WARN] Backend is in degraded mode (MongoDB unavailable)."
  echo "[INFO] Verifying degraded-mode DB guard behavior..."

  DEGRADED_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/students")"
  if [ "$DEGRADED_STATUS" != "503" ]; then
    echo "[FAIL] Expected 503 from DB-dependent endpoint in degraded mode, got HTTP $DEGRADED_STATUS"
    exit 1
  fi

  DEGRADED_JSON="$(curl -sS "$BASE_URL/students")"
  DEGRADED_ERR="$(python3 - <<'PY' "$DEGRADED_JSON"
import json,sys
try:
    data=json.loads(sys.argv[1])
    print(data.get('error',''))
except Exception:
    print('')
PY
)"

  if [ "$DEGRADED_ERR" != "Database unavailable" ]; then
    echo "[FAIL] Unexpected degraded error payload."
    echo "Response: $DEGRADED_JSON"
    exit 1
  fi

  echo "[OK] Degraded-mode DB guard is working (503 + Database unavailable)."
  echo "Smoke test passed (degraded mode)."
  exit 0
fi

USERNAME="smoke_admin_$(date +%s)"
EMAIL="$USERNAME@example.com"
PASSWORD="SmokePass123!"

echo "2) Register test admin..."
REGISTER_JSON="$(curl -sS -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"admin\"}")"

REG_SUCCESS="$(python3 - <<'PY' "$REGISTER_JSON"
import json,sys
try:
    data=json.loads(sys.argv[1])
    print('true' if data.get('success') else 'false')
except Exception:
    print('false')
PY
)"

if [ "$REG_SUCCESS" != "true" ]; then
  echo "[WARN] Register did not return success. Continuing to login test."
fi

echo "3) Login test admin..."
LOGIN_JSON="$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")"

TOKEN="$(python3 - <<'PY' "$LOGIN_JSON"
import json,sys
try:
    data=json.loads(sys.argv[1])
    print(data.get('token',''))
except Exception:
    print('')
PY
)"

if [ -z "$TOKEN" ]; then
  echo "[FAIL] Login failed or token missing."
  echo "Response: $LOGIN_JSON"
  exit 1
fi
echo "[OK] Login succeeded"

echo "4) Auth /me endpoint..."
ME_JSON="$(curl -sS "$BASE_URL/auth/me" -H "Authorization: Bearer $TOKEN")"
ME_SUCCESS="$(python3 - <<'PY' "$ME_JSON"
import json,sys
try:
    data=json.loads(sys.argv[1])
    print('true' if data.get('success') else 'false')
except Exception:
    print('false')
PY
)"

if [ "$ME_SUCCESS" != "true" ]; then
  echo "[FAIL] /auth/me failed"
  echo "Response: $ME_JSON"
  exit 1
fi
echo "[OK] /auth/me passed"

echo "5) Protected students list endpoint..."
STUDENTS_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/students" -H "Authorization: Bearer $TOKEN")"
if [ "$STUDENTS_STATUS" != "200" ]; then
  echo "[FAIL] /students returned HTTP $STUDENTS_STATUS"
  exit 1
fi
echo "[OK] /students passed"

echo
echo "Smoke test passed."
