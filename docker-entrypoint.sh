#!/bin/sh
set -e

# Auto-migrate database
echo "Running database migrations..."
npx prisma db push --accept-data-loss

# Start the application
exec "$@"
