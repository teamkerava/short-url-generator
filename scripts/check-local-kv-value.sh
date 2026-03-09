#!/bin/bash

[ -z "$1" ] && echo "Usage: $0 <short_code>" && exit 1

CODE=$1

wrangler kv key get $CODE --binding SHORT_URLS --local | jq