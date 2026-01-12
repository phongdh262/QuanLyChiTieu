#!/bin/sh

# Configuration
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="backup_$TIMESTAMP.sql"
DAYS_TO_KEEP=7

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Create Backup using mysqldump inside the mariadb container
# Note: This script is intended to run on the HOST machine via cron, or inside a container with access to docker/mariadb client.
# Based on user context (Docker Compose), we should run `docker exec` from the host.

echo "[$(date)] Starting backup..."

# If running from Host
# docker exec global-mariadb mysqldump -u root -p2126# chitieu > $BACKUP_DIR/$FILENAME

# IMPROVEMENT: Since we don't know if 'global-mariadb' container name is fixed or hashed by compose in some envs, 
# and we are inside the project folder. Use docker compose exec if possible, or assume container name.
# User's docker-compose.yml says: 
# external_links: - global-mariadb
# This means the DB is in another container named `global-mariadb`.

if docker exec global-mariadb mysqldump -u root -p2126# chitieu > "$BACKUP_DIR/$FILENAME"; then
    echo "[$(date)] Backup success: $FILENAME"
else
    echo "[$(date)] Backup failed!"
    exit 1
fi

# Cleanup old backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +$DAYS_TO_KEEP -exec rm {} \;
echo "[$(date)] Cleaned up backups older than $DAYS_TO_KEEP days."
