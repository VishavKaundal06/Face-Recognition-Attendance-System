#!/usr/bin/env bash
set -euo pipefail

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
if ! BREW_BIN="$(resolve_brew 2>/dev/null)"; then
  echo "Homebrew binary not found. Install Homebrew first: https://brew.sh"
  exit 1
fi

BREW_DIR="$(dirname "$BREW_BIN")"
EXPORT_LINE="export PATH=\"$BREW_DIR:\$PATH\""

TARGET_FILE="${HOME}/.zprofile"
touch "$TARGET_FILE"

if grep -Fq "$EXPORT_LINE" "$TARGET_FILE"; then
  echo "PATH already contains Homebrew in $TARGET_FILE"
else
  echo "$EXPORT_LINE" >> "$TARGET_FILE"
  echo "Added Homebrew PATH to $TARGET_FILE"
fi

echo "Current brew: $BREW_BIN"
echo "Restart terminal or run: source ~/.zprofile"
