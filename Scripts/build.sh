#!/usr/bin/env bash
# Clean build of core then cli.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm -r --filter './packages/*' clean || true
pnpm -r --filter './packages/*' build
echo "✓ built packages/core and packages/cli"
