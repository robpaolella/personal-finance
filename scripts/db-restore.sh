#!/bin/bash
# Restore database from a backup
# Usage: ./scripts/db-restore.sh backups/ledger-20250221-143000.db
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/db-restore.sh <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/*.db 2>/dev/null || echo "  No backups found"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "✗ Backup file not found: $1"
  exit 1
fi

DB_PATH="./packages/server/data/ledger.db"

echo "⚠️  This will replace the current database with: $1"
read -p "Are you sure? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

# Safety: backup current before restoring
if [ -f "$DB_PATH" ]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  mkdir -p ./backups
  cp "$DB_PATH" "./backups/ledger-pre-restore-$TIMESTAMP.db"
  echo "✓ Current database backed up first"
fi

rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
cp "$1" "$DB_PATH"
echo "✓ Restored from $1"
