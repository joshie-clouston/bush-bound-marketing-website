#!/usr/bin/env bash
# Apply all D1 migrations in order. Idempotent: errors on re-applied
# migrations (e.g. column already exists) are tolerated locally.
#
# Usage:
#   scripts/migrate.sh local   # applies to local .wrangler state
#   scripts/migrate.sh remote  # applies to production D1
set -u

TARGET="${1:-}"
if [[ "$TARGET" != "local" && "$TARGET" != "remote" ]]; then
  echo "Usage: $0 <local|remote>" >&2
  exit 1
fi

FLAG="--$TARGET"
DB="bushbound-db"
DIR="drizzle/migrations"

shopt -s nullglob
files=("$DIR"/*.sql)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No migrations found in $DIR" >&2
  exit 1
fi

for f in "${files[@]}"; do
  echo "→ Applying $(basename "$f") to $TARGET"
  if ! npx wrangler d1 execute "$DB" "$FLAG" --file="$f"; then
    echo "  (skipped — likely already applied)"
  fi
done
