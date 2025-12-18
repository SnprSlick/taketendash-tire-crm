#!/bin/bash

# Ensure we are in the root
cd "$(dirname "$0")/.."

echo "📦 Creating database backup from LOCAL HOST Postgres..."

# Create backups directory
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backups/tire_crm_local_backup_$TIMESTAMP.sql"

# Dump the database
# Assuming the local database is named 'tire_crm_dev' and user is 'kenny' or current user
# We try to use the current user first, or fallback to postgres if needed.
# Since 'psql -d tire_crm_dev' worked without user arg, we'll try pg_dump the same way.

echo "⏳ Dumping database 'tire_crm_dev'..."
pg_dump -d tire_crm_dev --clean --if-exists --no-owner --no-acl > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully at: $FILENAME"
    echo ""
    echo "🚀 To restore this to Railway:"
    echo "1. Make sure you have created a PostgreSQL service in your Railway project."
    echo "2. Install Railway CLI: npm i -g @railway/cli"
    echo "3. Login: railway login"
    echo "4. Link your project: railway link"
    echo "5. Run the restore command:"
    echo "   cat $FILENAME | railway connect --service postgres"
else
    echo "❌ Backup failed. Please check if 'pg_dump' is installed and accessible."
fi
