#!/bin/bash
set -e

echo "=== [1/4] Pulling latest code from Git ==="
git pull github main

echo "=== [2/4] Shutting down current containers ==="
docker compose down

echo "=== [3/4] Rebuilding and starting container backend ==="
docker compose up --build -d

echo "=== [4/4] Cleaning up unused Docker images ==="
docker image prune -f

echo "=== Check Container Status ==="
docker compose ps

echo "=== Deploy successfully! ==="
