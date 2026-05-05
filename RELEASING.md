# Releasing tracedog

Lockstep versioning: `@iamdotk/tracedog-core` and `@iamdotk/tracedog-cli` always ship at the same version.

## Steps

1. Run the gate: `pnpm check`
2. Bump version in **both** package.jsons and root `package.json`.
3. Update `CHANGELOG.md` — move `Unreleased` items under the new version with date.
4. Commit: `chore(release): vX.Y.Z`
5. Tag: `git tag vX.Y.Z`
6. Publish (core first, then cli):
   ```bash
   pnpm --filter @iamdotk/tracedog-core publish --access public
   pnpm --filter @iamdotk/tracedog-cli  publish --access public
   ```
7. Push: `git push && git push --tags`

If publishing fails partway, do **not** retry blind — npm will reject duplicate versions. Bump the patch and try again.
