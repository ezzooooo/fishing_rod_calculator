#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"
if [[ ! -d node_modules ]]; then
  npm ci
fi
node scripts/build_web.mjs --require-config
npx wrangler pages deploy out \
  --project-name fishjoongo-helper \
  --branch master
