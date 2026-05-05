#!/usr/bin/env bash
# The gate: run before handoff. Mirrors `pnpm check`.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm format:check
pnpm lint
pnpm build
pnpm test
echo "✓ all checks passed"
