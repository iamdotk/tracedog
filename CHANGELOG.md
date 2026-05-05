# Changelog

All notable changes to this project will be documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [SemVer](https://semver.org/).

## [Unreleased]

### Added
- **Multi-provider support**: bring your own model from any of 9 providers — Anthropic, OpenAI, OpenRouter, DeepSeek, xAI (Grok), Z.ai (GLM), Groq, Ollama, or any OpenAI-compatible endpoint. Per-provider keys preserved across switches.
- **Provider abstraction**: `Backend` interface with `AnthropicBackend` (native SDK + adaptive thinking + effort) and `OpenAIBackend` (OpenAI-compatible — works for OpenAI + every other provider via custom baseUrl).
- **Config commands**: `config set-provider <name>` switches active provider (asks for key if new); `config set-model <id>` changes model for active provider; `config show` prints all configured providers with masked keys.
- **--provider flag** on `ask` / `chat` for per-call overrides.
- **Backward-compat schema migration**: existing `~/.tracedog/credentials.json` from v0 (single Anthropic key + ModelChoice) auto-migrates on read into multi-provider format.
- **Hybrid model**: templated commands work without an AI key (free, fast, deterministic). AI agent is the escape hatch for exploratory questions.
- **Templated commands** (no AI): `services`, `errors`, `slow`, `health <service>` — clean terminal tables backed by Datadog's aggregate API.
- **Multi-model support**: pick `opus | sonnet | haiku` per command (`--model`) or as default (`config set-model`). Sonnet is the default for cost.
- **Config command**: `config show` (masked), `config path`, `config edit`, `config set-model`. Anthropic step in setup is now optional.
- **Aggregate API tools** for the agent: `aggregate_spans` and `list_recent_errors` — the agent picks these for broad questions instead of dumping raw spans.
- **AI agent**: `tracedog ask "<question>"` and `tracedog chat` — Claude calls Datadog tools (`list_services`, `aggregate_spans`, `list_recent_errors`, `search_spans`, `get_trace`) to answer plain-English investigation questions.
- **Interactive setup** (`tracedog setup`): wizard prompts for Datadog + Anthropic keys, validates each connection, saves to `~/.tracedog/credentials.json` with mode 0600.
- **Credential storage** in core (`storage.ts`): file-based, env-var fallback, never embedded in code.
- Tool runner loop with prompt caching on the system prompt.

### Changed
- Removed env-var-only auth path from `cli/config.ts`. The CLI now delegates to `loadOrEnv()` in core, which prefers stored credentials.
- Bumped `@anthropic-ai/sdk` to ^0.94 and `zod` to ^4 (required for `betaZodTool` + adaptive thinking on Opus 4.7).

### Initial scaffold
- `@tracedog/core` (Datadog client, formatters, types) and `@tracedog/cli` (`list`, `show`, `watch`).
- pnpm workspace, vitest, oxlint, AGENTS.md, CLAUDE.md.
