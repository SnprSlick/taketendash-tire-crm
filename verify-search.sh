#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Searching for 'Justin'..."
curl -s -X GET "http://localhost:3001/api/v1/users/employees/search?q=Justin" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "Searching for 'a'..."
curl -s -X GET "http://localhost:3001/api/v1/users/employees/search?q=a" \
  -H "Authorization: Bearer $TOKEN"
echo ""
