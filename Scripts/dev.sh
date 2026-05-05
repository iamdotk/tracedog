#!/usr/bin/env bash
# Run the CLI in dev mode (tsx, no build step). Usage: ./Scripts/dev.sh list --service my-service
set -euo pipefail
cd "$(dirname "$0")/.."
exec pnpm --filter @iamdotk/tracedog-cli dev "$@"
