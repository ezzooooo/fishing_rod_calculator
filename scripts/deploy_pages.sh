#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DART_DEFINES_FILE="${PROJECT_ROOT}/.vscode/dart_defines.local.json"

if [[ ! -f "${DART_DEFINES_FILE}" ]]; then
  echo "Missing Dart defines file: ${DART_DEFINES_FILE}" >&2
  exit 1
fi

cd "${PROJECT_ROOT}"

flutter build web --release \
  --pwa-strategy=none \
  --dart-define-from-file="${DART_DEFINES_FILE}"

npx wrangler pages deploy build/web \
  --project-name fishjoongo-helper \
  --branch master
