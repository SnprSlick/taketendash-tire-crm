#!/bin/sh

echo "=== TakeTenDash Backend Startup ==="
echo "Starting backend service..."

echo "🔄 Running Prisma DB Push..."
npx prisma db push

echo "🔄 Starting NestJS application..."
npm run start:dev