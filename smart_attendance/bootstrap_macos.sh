#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Smart Attendance macOS Bootstrap"
echo "-------------------------------"

if ! xcode-select -p >/dev/null 2>&1; then
  echo "Xcode Command Line Tools not found."
  echo "Launching installer..."
  xcode-select --install || true
  echo "After installation completes, rerun: npm run mac:bootstrap"
  exit 1
fi

echo "[1/5] Installing Homebrew (if needed)..."
"$ROOT_DIR/install_homebrew_macos.sh" || true

echo "[2/5] Fixing brew PATH..."
"$ROOT_DIR/fix_brew_path.sh" || true

# Try to load brew in current shell if installed in standard locations
if [ -x "/opt/homebrew/bin/brew" ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x "/usr/local/bin/brew" ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

echo "[3/5] Installing MongoDB..."
"$ROOT_DIR/install_mongodb_macos.sh" || true

echo "[4/5] Running MongoDB diagnostics..."
"$ROOT_DIR/mongo_doctor.sh" || true

echo "[5/5] Running project setup checks..."
cd "$ROOT_DIR"
npm run setup || true

echo
echo "Bootstrap finished."
echo "If MongoDB is reachable, start everything with: npm run up"
