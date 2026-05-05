#!/usr/bin/env bash
# Publish core then cli, in that order. Usage: ./Scripts/release.sh
set -euo pipefail
cd "$(dirname "$0")/.."

./Scripts/check.sh

VERSION=$(node -p "require('./package.json').version")
echo "Publishing version $VERSION (core first, then cli)…"

pnpm --filter @iamdotk/tracedog-core publish --access public --no-git-checks
pnpm --filter @iamdotk/tracedog-cli  publish --access public --no-git-checks

echo "✓ published @iamdotk/tracedog-core@$VERSION and @iamdotk/tracedog-cli@$VERSION"
echo "Don't forget: git tag v$VERSION && git push --tags"
