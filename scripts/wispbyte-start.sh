#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f package.json ]]; then
  echo "Run from repo root (package.json missing)" >&2
  exit 1
fi
npm ci
npm run db:generate
npm run build
exec node dist/index.js
