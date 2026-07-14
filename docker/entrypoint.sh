#!/bin/sh
set -e



wait_for() {
  local service=$1
  local port=$2
  i=1
  while [ $i -le 60 ]; do
    if nc -z $service $port 2>/dev/null; then
      echo "$service:$port ready"
      return 0
    fi
    echo "Waiting for $service:$port ($i/60)..."
    sleep 3
    i=$((i + 1))
  done
  echo "Timeout waiting for $service:$port"
  exit 1
}

# Wait for dependencies
wait_for db 5432
wait_for redis 6379
wait_for minio 9000

# MinIO bucket init handled by app.js initMinio()
echo "MinIO ready - bucket init by app..."

# Migrate (seeding dijalankan secara manual di production untuk menghindari data loss)
echo "Running knex migrations..."
npx knex migrate:latest

echo "Setup complete, exec app..."
exec "$@"
