
#!/bin/bash

# Login and get token
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}')

TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed"
  echo $RESPONSE
  exit 1
fi

echo "Token: $TOKEN"

# Search employees
echo "Searching for 'Justin'..."
curl -v -X GET "http://localhost:3001/api/v1/users/search-employees?q=Justin" \
  -H "Authorization: Bearer $TOKEN"
