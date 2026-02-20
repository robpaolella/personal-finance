#!/bin/bash
set -e

# Generate .env with JWT_SECRET if it doesn't exist
if [ ! -f .env ]; then
  echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
  echo "Generated .env with JWT_SECRET"
fi

# Build the image
docker compose build

# Seed the database if it has no tables (first run)
NEEDS_SEED=false
if [ ! -f ./data/ledger.db ] || [ ! -s ./data/ledger.db ]; then
  NEEDS_SEED=true
fi

if [ "$NEEDS_SEED" = true ]; then
  echo "Seeding database..."
  docker compose run --rm ledger npm run seed:prod
fi

# Start the container
docker compose up -d

echo ""
echo "Ledger is running at http://localhost:3001"
