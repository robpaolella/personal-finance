#!/bin/bash
# Build and verify the Docker image locally
set -e

echo "=== Building Docker image ==="
docker compose build

echo ""
echo "✓ Build successful"
echo ""
echo "To test locally: docker compose up -d"
echo "To deploy: ./scripts/deploy.sh"
