#!/bin/bash
# Backup the current database
set -e

DB_PATH="./packages/server/data/ledger.db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

if [ ! -f "$DB_PATH" ]; then
  echo "✗ No database found at $DB_PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/ledger-$TIMESTAMP.db"
echo "✓ Backed up to $BACKUP_DIR/ledger-$TIMESTAMP.db"
