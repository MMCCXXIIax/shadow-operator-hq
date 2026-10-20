#!/bin/bash
# Dump the workspace Postgres database to a timestamped, gzipped SQL file.
#
# The schema-changing workflow for this repo is "back up, then migrate"
# (see scripts/db-restore.sh for the recovery path). Run this from the repo
# root before applying any migration.
#
#   scripts/db-backup.sh
#   BACKUP_DIR=/tmp/dumps scripts/db-backup.sh
#
# Requires the compose stack's `db` service to be running. Reads the database
# name/user from compose, so it never needs or prints the password.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.base44.yml}"
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-app}"
DB_NAME="${DB_NAME:-app}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/shadowos-$STAMP.sql.gz"

mkdir -p "$OUT_DIR"

docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip > "$FILE"

# pg_dump writes to the pipe; gzip's exit status alone would hide a failure,
# so check the dump is a real gzip stream with content.
if ! gzip -t "$FILE" 2>/dev/null || [ ! -s "$FILE" ]; then
  echo "Backup failed: $FILE is missing or unreadable" >&2
  exit 1
fi

echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
