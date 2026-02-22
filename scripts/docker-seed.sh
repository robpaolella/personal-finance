#!/bin/bash
# Seed the database inside Docker
# Use after a fresh deploy when the database is empty
set -e

echo "Seeding database inside Docker container..."
docker compose exec ledger npm run seed:prod

echo "✓ Database seeded"
echo ""
echo "Visit the app to create your admin account."
