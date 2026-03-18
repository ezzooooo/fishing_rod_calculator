#!/usr/bin/env bash

set -euo pipefail

: "${FIREBASE_WEB_API_KEY:?FIREBASE_WEB_API_KEY is required}"

flutter build web --release \
  --pwa-strategy=none \
  --dart-define=FIREBASE_WEB_API_KEY="${FIREBASE_WEB_API_KEY}"

npx wrangler pages deploy build/web \
  --project-name fishjoongo-helper \
  --branch master
