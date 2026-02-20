#!/bin/bash
set -e

# Generate .env with JWT_SECRET if it doesn't exist
if [ ! -f .env ]; then
  echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
  echo "Generated .env with JWT_SECRET"
fi

# Build and start the container
docker compose up -d --build

# Wait for the container to be healthy
echo "Waiting for container to start..."
sleep 3

# Seed the database if it doesn't exist yet
if [ ! -f ./data/ledger.db ]; then
  echo "Seeding database..."
  docker compose exec ledger npm run seed:prod
fi

echo ""
echo "Ledger is running at http://localhost:3001"
