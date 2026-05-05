# Claude Code rules for tracedog

Read `AGENTS.md` first — it has the full conventions. This file lists the rules Claude Code should always follow.

- Always run `pnpm check` before reporting a task complete.
- Never add a dependency without checking `package.json` and asking first.
- Never put I/O or env reads into `@tracedog/core` — those belong in the CLI.
- When changing the public API of core, bump both packages and update `CHANGELOG.md`.
- Prefer editing existing files over adding new ones; one file per command in `packages/cli/src/commands/`.
- For UI changes (terminal output), show a sample of the rendered output in the PR description.
