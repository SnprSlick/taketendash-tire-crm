#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done

echo "Database is ready."

# Use simple server while fixing compilation issues
echo "Starting simple API server..."
node simple-server.js