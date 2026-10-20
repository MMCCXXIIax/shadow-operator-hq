#!/bin/bash
# Restore a dump produced by scripts/db-backup.sh into a *separate* database and
# verify it loads, so the recovery path is proven without touching live data.
#
#   scripts/db-restore.sh backups/shadowos-20260101T000000Z.sql.gz
#   scripts/db-restore.sh <dump> --verify-only   # load, count, drop
#
# Restoring over the live `app` database is deliberately not automated: stop the
# api/web services first, then
#   gunzip -c <dump> | docker compose -f docker-compose.base44.yml \
#     exec -T db psql -U app -d app
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.base44.yml}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-app}"

DUMP="${1:?usage: scripts/db-restore.sh <dump.sql.gz> [--verify-only]}"
VERIFY_ONLY="${2:-}"
TARGET_DB="${TARGET_DB:-shadowos_restore_check}"

[ -f "$DUMP" ] || { echo "No such dump: $DUMP" >&2; exit 1; }

psql_db() {
  local db="$1"
  shift
  # Forward the remaining arguments (-c .../-Atc ...) to psql; without "$@"
  # psql would read an empty stdin and exit 0 having run nothing.
  docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$db" -v ON_ERROR_STOP=1 "$@"
}

echo "Recreating scratch database $TARGET_DB"
# Drop leftover sessions from an interrupted run first: Postgres refuses to drop
# a database that clients are still connected to. Drop and create run as
# separate invocations so a skipped create can never be mistaken for success.
psql_db postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid()" \
  -c "DROP DATABASE IF EXISTS $TARGET_DB" >/dev/null
psql_db postgres -c "CREATE DATABASE $TARGET_DB" >/dev/null

if [ "$(psql_db postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB'")" != "1" ]; then
  echo "Failed to create scratch database $TARGET_DB" >&2
  exit 1
fi

echo "Loading $DUMP into $TARGET_DB"
gunzip -c "$DUMP" | psql_db "$TARGET_DB" >/dev/null

echo "Verifying row counts in $TARGET_DB"
psql_db "$TARGET_DB" -c "SELECT 'users' AS table, count(*) FROM users
  UNION ALL SELECT 'leads', count(*) FROM leads
  UNION ALL SELECT 'follow_ups', count(*) FROM follow_ups"

if [ "$VERIFY_ONLY" = "--verify-only" ]; then
  echo "Dropping scratch database $TARGET_DB"
  psql_db postgres -c "DROP DATABASE IF EXISTS $TARGET_DB" >/dev/null
  echo "Restore verified; live database untouched."
else
  echo "Restored into $TARGET_DB (kept). Drop it with:"
  echo "  docker compose -f docker-compose.base44.yml exec -T db psql -U app -d postgres -c 'DROP DATABASE $TARGET_DB'"
fi
