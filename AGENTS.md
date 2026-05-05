# Tracedog — Agent Guide

Single source of truth: `~/dhanasekaran/tracedog`. Read this file before making changes.

## What this is

An **AI agent in the terminal** that helps developers investigate Datadog APM data without knowing Datadog. Claude (`claude-opus-4-7`) calls three Datadog tools (`list_services`, `search_spans`, `get_trace`) to answer plain-English questions like "why is checkout slow?" or "any errors today?".

## Workspace layout

- pnpm monorepo, two packages:
  - `@tracedog/core` (`packages/core`) — pure library. Datadog client, agent, tool definitions, credential storage, formatters. **No CLI deps. No `process.argv`/`process.exit`. No interactive prompts.**
  - `@tracedog/cli` (`packages/cli`) — terminal UX. Interactive prompts, command routing, output. Depends on core.
- Lockstep versioning: bump both packages together. Publish order: core first, then cli.

## Build, test, run

- Install: `pnpm install`
- Build: `pnpm build` (builds core first, then cli)
- Gate (run before handoff): `pnpm check` — format check + lint + build + tests
- Tests: `pnpm test` (vitest, node env, no real Datadog/Anthropic calls — stub `fetch` if needed)
- Try the CLI in dev: `pnpm dev ask "what services have errors?"` (tsx, no build)
- After build: `node packages/cli/dist/bin/tracedog.js <cmd>`

## Where things live

| Concern | File |
|---|---|
| Datadog API client | `packages/core/src/client.ts` |
| Tool definitions exposed to Claude | `packages/core/src/tools.ts` |
| Agent loop (Claude + toolRunner) | `packages/core/src/agent.ts` |
| Credential storage (file mode 0600) | `packages/core/src/storage.ts` |
| Setup wizard | `packages/cli/src/commands/setup.ts` |
| `ask` / `chat` / `list` / `show` / `watch` | `packages/cli/src/commands/*.ts` |
| CLI router | `packages/cli/src/index.ts` |

## Coding style

- TypeScript strict, `noUncheckedIndexedAccess`, ESM only (`"type": "module"`)
- Format/lint: `oxlint` + `oxfmt`. Run `pnpm format && pnpm lint` before commit.
- 2-space indent. Named exports only.
- Imports inside the workspace use `.js` extensions (NodeNext resolution).
- Errors: throw `Error` with a clear message. The CLI catches and prints; **core never calls `process.exit`**.

## Anthropic SDK rules (load-bearing)

- Default model: `claude-opus-4-7`. Never downgrade unless the user asks.
- Use **adaptive thinking** (`thinking: { type: "adaptive" }`) — never `budget_tokens`, never sampling params (`temperature`, `top_p`, `top_k`) on Opus 4.7 (they 400).
- Use `output_config: { effort: "high" | "xhigh" }` — `xhigh` for agentic / coding work.
- Use `betaZodTool` from `@anthropic-ai/sdk/helpers/beta/zod` for tool definitions, paired with **zod v4**.
- Use `client.beta.messages.toolRunner({...}).done()` — don't hand-roll the agent loop.
- Cache the system prompt: wrap it in a text block with `cache_control: { type: "ephemeral" }`. Never interpolate timestamps/UUIDs — that invalidates the cache.
- Tool `run` functions must return `string` or content-block array. JSON-stringify structured data.

## Datadog API rules

- Endpoint: `POST /api/v2/spans/events/search`. Headers: `DD-API-KEY` + `DD-APPLICATION-KEY`.
- `site` is configurable. Default is `datadoghq.com` only inside `storage.ts` / `setup.ts`. Never hardcode anywhere else.
- Never log credentials. Never include them in error messages.

## Credential rules

- Storage location: `~/.tracedog/credentials.json`, file mode `0600`, parent dir `0700`.
- Override path with `TRACEDOG_CONFIG=/abs/path` env var.
- Loader precedence: stored file → env vars (`DD_API_KEY`, `DD_APP_KEY`, `DD_SITE`, `ANTHROPIC_API_KEY`).
- The CLI is the only place that reads env. Core's `Agent` takes credentials as constructor args.
- New code that prompts for secrets must use `password({ mask: "*" })` — never `input()`.

## Adding a new tool

1. Add a `betaZodTool({...})` block in `packages/core/src/tools.ts` and include it in the returned array.
2. Tool description should be specific and verb-led: explain *when* to use it relative to the others.
3. `run` returns `JSON.stringify(result, null, 2)`.
4. No new tool dependencies without confirmation.

## Adding a new command

1. New file in `packages/cli/src/commands/<name>.ts` exporting `run<Name>(opts)`.
2. Wire into the switch in `packages/cli/src/index.ts`.
3. Update `HELP` string in `index.ts` and the README.

## Testing

- Tests live in `packages/<pkg>/tests/*.test.ts`. Vitest, node env.
- No real Datadog or Anthropic calls. Stub `fetch` for client tests, or mock the `Agent` for command tests.
- Add a test for every formatter/parser branch and every new tool's input shaping.

## Commit style

- Conventional Commits: `feat(core): add summarize_errors tool`, `fix(cli): mask anthropic key in setup`.
- Imperative, ≤ 72 chars. Never include credentials in commits or messages.

## Agent Notes (gotchas)

- The Anthropic SDK ≥ 0.94 ships `BetaContentBlock` with multiple variants (`text`, `tool_use`, `thinking`, etc.). Don't write type predicates with extra fields — narrow with `b.type === "text"` only.
- Zod v4 `ZodObject` is incompatible with the SDK's `ZodType<unknown, unknown, ...>` — `betaZodTool` resolves this internally; do not annotate `inputSchema` with an explicit `ZodType` cast.
- `oxlint` v0.15 doesn't catch all type-level issues. The build (`tsc`) is the real correctness gate.
- The pnpm registry override (`.npmrc`) keeps personal builds out of Amplify's CodeArtifact. Don't remove it without replacing.
