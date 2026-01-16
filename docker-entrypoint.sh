#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set."
  exit 1
fi

# Auto-migrate database
echo "Running database migrations..."
# Use global prisma binary
prisma db push --accept-data-loss

# Start the application
echo "Starting application..."
exec "$@"
