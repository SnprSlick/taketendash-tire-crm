#!/bin/bash

# Ensure we are in the root
cd "$(dirname "$0")/.."

echo "📦 Creating database backup from local Docker container..."

# Check if container is running
if [ ! "$(docker ps -q -f name=tire-crm-postgres)" ]; then
    echo "❌ Error: tire-crm-postgres container is not running."
    echo "Please run 'docker-compose up -d postgres' first."
    exit 1
fi

# Create backups directory
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backups/tire_crm_backup_$TIMESTAMP.sql"

# Dump the database
# We use the credentials from docker-compose.dev.yml
# Using -U postgres and -d tire_crm_dev
echo "⏳ Dumping database 'tire_crm_dev'..."
docker exec -t tire-crm-postgres pg_dump -U postgres -d tire_crm_dev --clean --if-exists > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully at: $FILENAME"
    echo ""
    echo "🚀 To restore this to Railway:"
    echo "1. Make sure you have created a PostgreSQL service in your Railway project."
    echo "2. Install Railway CLI: npm i -g @railway/cli"
    echo "3. Login: railway login"
    echo "4. Link your project: railway link"
    echo "5. Run the restore command (replace 'postgres' with your service name if different):"
    echo "   cat $FILENAME | railway connect --service postgres"
else
    echo "❌ Backup failed."
fi
