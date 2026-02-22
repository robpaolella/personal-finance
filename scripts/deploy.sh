#!/bin/bash
# Deploy to production server
# Update SERVER and APP_DIR below to match your setup
set -e

# ── Configuration ──────────────────────────────
SERVER="user@your-server-ip"
APP_DIR="~/personal-finance"
HEALTH_URL="http://localhost:3001/api/health"
# ────────────────────────────────────────────────

echo "=== Pre-deploy checks ==="

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "✗ You have uncommitted changes. Commit or stash them first."
  exit 1
fi

BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

# Confirm deployment
echo ""
read -p "Deploy $BRANCH to production? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "=== Pushing to GitHub ==="
git push origin "$BRANCH"

echo ""
echo "=== Deploying to server ==="
ssh "$SERVER" << REMOTE
set -e
cd $APP_DIR

echo "Pulling latest code..."
git pull origin $BRANCH

echo "Backing up database..."
TIMESTAMP=\$(date +%Y%m%d-%H%M%S)
mkdir -p ~/backups
if [ -f ./data/ledger.db ]; then
  cp ./data/ledger.db ~/backups/ledger-pre-deploy-\$TIMESTAMP.db
  echo "✓ Database backed up"
fi

echo "Rebuilding Docker image..."
docker compose build

echo "Restarting container..."
docker compose up -d

echo "Waiting for health check..."
sleep 5
if curl -sf $HEALTH_URL | grep -q "ok"; then
  echo "✓ Health check passed — app is running"
else
  echo "✗ Health check failed!"
  echo "Check logs: docker compose logs -f"
  echo ""
  echo "To rollback the database:"
  echo "  cp ~/backups/ledger-pre-deploy-\$TIMESTAMP.db ./data/ledger.db"
  echo "  docker compose restart"
  exit 1
fi
REMOTE

echo ""
echo "✓ Deployment complete"
