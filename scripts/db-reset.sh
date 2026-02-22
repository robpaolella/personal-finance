#!/bin/bash
# Wipe the database and start fresh
# WARNING: This deletes ALL data. Only use in development.
set -e

echo "⚠️  This will delete ALL data in the database."
read -p "Are you sure? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

DB_PATH="./packages/server/data/ledger.db"

rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
echo "✓ Database deleted"

npm run seed
echo "✓ Database seeded"

echo ""
echo "Done. Visit the app to create your admin account."
