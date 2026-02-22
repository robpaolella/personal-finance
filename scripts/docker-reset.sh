#!/bin/bash
# Reset the production database inside Docker
# WARNING: This deletes ALL PRODUCTION DATA.
set -e

echo "⚠️  This will delete ALL PRODUCTION DATA."
echo "⚠️  This action cannot be undone without a backup."
echo ""
read -p "Type 'RESET' to confirm: " confirm

if [ "$confirm" != "RESET" ]; then
  echo "Cancelled."
  exit 0
fi

# Backup first
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p ./backups
if [ -f ./data/ledger.db ]; then
  cp ./data/ledger.db "./backups/ledger-pre-reset-$TIMESTAMP.db"
  echo "✓ Backed up to backups/ledger-pre-reset-$TIMESTAMP.db"
fi

# Stop container, remove DB, restart, seed
docker compose down
rm -f ./data/ledger.db ./data/ledger.db-wal ./data/ledger.db-shm
docker compose up -d
sleep 3
docker compose exec ledger npm run seed:prod

echo ""
echo "✓ Database reset and seeded"
echo "Visit the app to create your admin account."
