#!/bin/sh
set -e

echo "Running Prisma db push to sync schema..."
max_retries=5
counter=0
while [ $counter -lt $max_retries ]; do
    if prisma db push --skip-generate --accept-data-loss; then
        echo "Prisma db push completed successfully!"
        break
    else
        echo "Prisma db push failed. Retrying in 3 seconds... ($((counter+1))/$max_retries)"
        counter=$((counter+1))
        sleep 3
    fi
done

echo "Starting Next.js server..."
exec node server.js
