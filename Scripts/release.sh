#!/usr/bin/env bash
# Publish core then cli, in that order. Usage: ./Scripts/release.sh
set -euo pipefail
cd "$(dirname "$0")/.."

./Scripts/check.sh

VERSION=$(node -p "require('./package.json').version")
echo "Publishing version $VERSION (core first, then cli)…"

pnpm --filter @tracedog/core publish --access public --no-git-checks
pnpm --filter @tracedog/cli  publish --access public --no-git-checks

echo "✓ published @tracedog/core@$VERSION and @tracedog/cli@$VERSION"
echo "Don't forget: git tag v$VERSION && git push --tags"
