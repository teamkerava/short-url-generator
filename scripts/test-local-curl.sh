#!/bin/bash
DURATION=${1:-"24h"}

curl -s -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com", "duration": "'$DURATION'"}' | jq