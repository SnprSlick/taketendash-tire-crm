#!/bin/bash

# 1. Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')

echo "Login Response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Token: $TOKEN"

# 2. Change Password
echo "Changing password..."
CHANGE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"oldPassword":"admin","newPassword":"newpassword123"}')

echo "Change Password Response: $CHANGE_RESPONSE"
