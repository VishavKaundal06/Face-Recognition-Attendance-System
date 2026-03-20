#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"
EXAMPLE_FILE="$ROOT_DIR/backend/.env.example"

usage() {
  echo "Usage: ./use_remote_mongo.sh '<mongodb-uri>'"
  echo "Example: ./use_remote_mongo.sh 'mongodb+srv://user:pass@cluster.mongodb.net/smart_attendance'"
}

if [ "${1:-}" = "" ]; then
  usage
  exit 1
fi

URI="$1"

case "$URI" in
  mongodb://*|mongodb+srv://*) ;;
  *)
    echo "Invalid MongoDB URI. Must start with mongodb:// or mongodb+srv://"
    exit 1
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "Created backend/.env from template"
fi

BACKUP_FILE="$ENV_FILE.bak.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"

python3 - <<'PY' "$ENV_FILE" "$URI"
import pathlib, re, sys

env_path = pathlib.Path(sys.argv[1])
uri = sys.argv[2]
text = env_path.read_text(encoding='utf-8') if env_path.exists() else ''

if re.search(r'^MONGO_URI=.*$', text, flags=re.M):
    text = re.sub(r'^MONGO_URI=.*$', f'MONGO_URI={uri}', text, flags=re.M)
else:
    text += ('\n' if text and not text.endswith('\n') else '') + f'MONGO_URI={uri}\n'

if re.search(r'^ALLOW_START_WITHOUT_DB=.*$', text, flags=re.M):
    text = re.sub(r'^ALLOW_START_WITHOUT_DB=.*$', 'ALLOW_START_WITHOUT_DB=false', text, flags=re.M)
else:
    text += 'ALLOW_START_WITHOUT_DB=false\n'

env_path.write_text(text, encoding='utf-8')
PY

echo "Updated backend/.env"
echo "Backup saved: $BACKUP_FILE"
echo "- MONGO_URI set to remote URI"
echo "- ALLOW_START_WITHOUT_DB set to false"
echo
echo "Next: npm run doctor"
