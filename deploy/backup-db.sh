#!/usr/bin/env bash
# Nightly backup of the production database. Run it from cron on the server, for example at 02:00:
#
#   0 2 * * *  /home/matias/Project-Website/deploy/backup-db.sh >> /home/matias/backups/backup.log 2>&1
#
# It writes a compressed, restorable dump and removes dumps older than KEEP_DAYS. Authentication comes from
# ~/.pgpass (chmod 600) or peer auth, never from this file. Test a restore at least once:
#
#   createdb lablace_restore_test
#   pg_restore --no-owner -d lablace_restore_test ~/backups/lablace/lablace_db-YYYYMMDD-HHMMSS.dump
set -euo pipefail

DB="${DB_NAME:-lablace_db}"
DEST="${BACKUP_DIR:-$HOME/backups/lablace}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$DEST/$DB-$STAMP.dump"

pg_dump --no-owner --format=custom --file="$FILE" "$DB"
find "$DEST" -name "$DB-*.dump" -mtime +"$KEEP_DAYS" -delete

echo "$(date -Is) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
