#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${VERCEL_TOKEN:?Set VERCEL_TOKEN}"
: "${VERCEL_ORG_ID:?Set VERCEL_ORG_ID}"
: "${VERCEL_PROJECT_ID:?Set VERCEL_PROJECT_ID}"
npm ci
npm run verify
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
