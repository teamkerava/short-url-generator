#!/bin/bash

# Default to port 8787, but allow override via first argument
PORT=${1:-8787}
BASE_URL="http://localhost:$PORT"

echo "Testing against $BASE_URL..."
echo -e "\nWriting to KV (creating short URL)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/shorten" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}')

echo "$RESPONSE" | jq

# Extract the short code using jq
if command -v jq >/dev/null 2>&1; then
  CODE=$(echo "$RESPONSE" | jq -r '.code')
  SHORT_URL=$(echo "$RESPONSE" | jq -r '.shortUrl')
else
  # Fallback just in case
  CODE=$(echo "$RESPONSE" | grep -o '"code":"[^"]*' | cut -d'"' -f4)
  SHORT_URL=$(echo "$RESPONSE" | grep -o '"shortUrl":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$CODE" ] || [ "$CODE" == "null" ]; then
  echo "  Failed to create short URL. Is the server running?"
  exit 1
fi

echo -e "\nCreated short code: $CODE"
echo "Short URL: $SHORT_URL"


# KV store content
echo -e "\nInspecting local KV $CODE store content..."
# Using the binding name 'SHORT_URLS' from wrangler.toml
wrangler kv key get $CODE --binding SHORT_URLS --local | jq
