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

# Jalankan migrasi HANYA jika perintah yang akan dijalankan adalah aplikasi utama (app)
# Hal ini untuk mencegah worker container ikut menjalankan migrasi paralel yang bisa menyebabkan lock error.
if [ "$2" = "start:api" ]; then
  echo "App container detected. Running knex migrations..."
  npx knex migrate:latest

  # [DX-01] Automasi seed data jika diset via environment variable (khusus Development/UAT)
  if [ "$SEED_ON_STARTUP" = "true" ]; then
    echo "SEED_ON_STARTUP=true, running seeds and generation script..."
    # Jalankan seluruh file seed secara berurutan
    npx knex seed:run
    # Buat target target berjalan
    node scripts/generate_uat_targets.js
  else
    echo "SEED_ON_STARTUP not true. Seeding is skipped."
  fi
else
  echo "Worker container detected. Skipping migrations."
fi

echo "Setup complete, exec command..."
exec "$@"
