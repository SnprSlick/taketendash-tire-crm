#!/bin/bash
# Test CSV Database Import

echo "=== Testing CSV Database Import ==="
echo ""

echo "1. Checking if server is running on port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Server is running"
    PID=$(lsof -ti:3000)
    echo "   PID: $PID"
else
    echo "❌ No server found on port 3000"
    echo "   Please start the backend server first:"
    echo "   cd /Users/kenny/Documents/Apps/TakeTenDash/backend && npm run start:dev"
    exit 1
fi

echo ""
echo "2. Testing server connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
if [ "$HTTP_CODE" != "000" ]; then
    echo "✅ Server is responding (HTTP $HTTP_CODE)"
else
    echo "❌ Server is not responding"
    echo "   The process is running but not accepting connections"
    exit 1
fi

echo ""
echo "3. Checking upload directory..."
if [ -d "/Users/kenny/Documents/Apps/TakeTenDash/backend/uploads/csv" ]; then
    echo "✅ Upload directory exists"
else
    echo "⚠️  Creating upload directory..."
    mkdir -p /Users/kenny/Documents/Apps/TakeTenDash/backend/uploads/csv
    echo "✅ Upload directory created"
fi

echo ""
echo "4. Checking CSV file..."
CSV_FILE="/Users/kenny/Documents/Apps/TakeTenDash/backend/data/invoice2025small.csv"
if [ -f "$CSV_FILE" ]; then
    echo "✅ CSV file found"
    echo "   Size: $(wc -c < "$CSV_FILE") bytes"
    echo "   Lines: $(wc -l < "$CSV_FILE") lines"
else
    echo "❌ CSV file not found: $CSV_FILE"
    exit 1
fi

echo ""
echo "5. Testing import endpoint..."
echo "   Sending request to: POST http://localhost:3000/api/csv-import/database/import"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:3000/api/csv-import/database/import \
  -F "file=@$CSV_FILE" \
  2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Import successful!"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ Server error (500)"
    echo ""
    echo "Response:"
    echo "$BODY"
    echo ""
    echo "Check server logs for details:"
    echo "   Look at the terminal running 'npm run start:dev'"
else
    echo "❌ Request failed"
    echo ""
    echo "Response:"
    echo "$BODY"
fi

echo ""
echo "=== Test Complete ===" 
