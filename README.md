# tracedog

> Datadog APM from your terminal. Templated for common questions, AI for the rest.

Bring your own model: Anthropic, OpenAI, OpenRouter, DeepSeek, xAI (Grok), Z.ai (GLM), Groq, Ollama, or any OpenAI-compatible endpoint.

## Install

```bash
npm install -g @iamdotk/tracedog-cli
tracedog setup
```

### From source

```bash
git clone https://github.com/iamdotk/tracedog.git
cd tracedog
pnpm install
pnpm build
npm link packages/cli   # exposes `tracedog` on PATH
```

## Setup

```bash
tracedog setup
```

The wizard asks for:

1. **Datadog API key** + **Application key** + site (US1 / EU / US3 / US5 / AP1 / Gov)
2. **AI provider** (optional — pick one or skip)

Stored at `~/.tracedog/credentials.json` (mode 0600).

## Get API keys

| What | Where |
|---|---|
| Datadog API key | https://app.datadoghq.com/organization-settings/api-keys |
| Datadog Application key | https://app.datadoghq.com/personal-settings/application-keys |
| Anthropic (Claude) | https://console.anthropic.com/settings/keys |
| OpenAI (GPT) | https://platform.openai.com/api-keys |
| OpenRouter (50+ models, one key) | https://openrouter.ai/keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| xAI (Grok) | https://console.x.ai |
| Z.ai (GLM) | https://open.bigmodel.cn |
| Groq | https://console.groq.com/keys |
| Ollama (local, free) | https://ollama.com/download |

> ChatGPT Plus / Claude Pro / Grok Premium **subscriptions are not API keys**. You need a developer account on the provider's API platform.

## Commands

### Templated (no AI key needed)

```bash
tracedog services [--env prod] [--since 60] [--limit 50]
# Top services by traffic with error counts.

tracedog errors [--service X] [--env prod] [--since 60] [--limit 20]
# Unique error messages, grouped, with counts.

tracedog slow [--service X] [--env prod] [--since 60] [--limit 20]
# Slowest services or endpoints, sorted by p95.

tracedog health <service> [--env prod] [--since 60]
# One-page dashboard: span count, error rate, p50/p95/p99, top resources.
```

### AI agent (uses configured provider)

```bash
tracedog ask "<question>" [--provider <name>]
# One-shot natural-language query.

tracedog chat [--provider <name>]
# Interactive REPL. /exit to quit, /reset to clear context.
```

`<provider>` is one of: `anthropic`, `openai`, `openrouter`, `deepseek`, `xai`, `zai`, `groq`, `ollama`, `custom`.

### Direct (raw spans)

```bash
tracedog list [--service X] [--query Q] [--limit 50] [--since 15]
# Recent matching spans.

tracedog show <trace-id>
# Full span tree for a trace.

tracedog watch --service X [--interval 5000]
# Tail spans live.
```

### Config

```bash
tracedog config show                     # Print current config (masked)
tracedog config path                     # Print path to credentials file
tracedog config edit                     # Re-run setup wizard
tracedog config set-provider <name>      # Switch active provider (asks for key if new)
tracedog config set-model <id>           # Change model for active provider
```

## Examples

```bash
# Discover what's running in prod
tracedog services --env prod

# Find unique errors over the last 24 hours
tracedog errors --env prod --since 1440

# Health check for one service
tracedog health checkout-api --env prod

# Slowest endpoints in checkout-api
tracedog slow --service checkout-api --since 60

# Ask the AI to investigate
tracedog ask "why are checkout requests timing out?" --provider anthropic
tracedog ask "compare error rates between prod and staging" --provider openrouter

# Switch providers without re-entering keys
tracedog config set-provider deepseek
tracedog ask "what's the slowest service right now?"
```

## Datadog query syntax (for `--query` and AI tools)

| Filter | Meaning |
|---|---|
| `status:error` | Errored spans only |
| `@duration:>1s` | Spans longer than 1 second |
| `@http.status_code:500` | HTTP 5xx responses |
| `env:prod` | Production environment |
| `service:checkout-api` | One service |
| `env:prod status:error @duration:>1s` | Multiple filters (AND) |

## Environment variables (CI / non-interactive)

```bash
# Datadog (required)
DD_API_KEY=...
DD_APP_KEY=...
DD_SITE=datadoghq.com           # optional, default datadoghq.com

# AI provider (any one of these patterns)
ANTHROPIC_API_KEY=sk-ant-...    # auto-detected as 'anthropic' provider
OPENAI_API_KEY=sk-...           # auto-detected as 'openai' provider

# Or, for any provider:
TRACEDOG_PROVIDER=openrouter
TRACEDOG_API_KEY=sk-or-...
TRACEDOG_MODEL=anthropic/claude-sonnet-4.6
TRACEDOG_BASE_URL=https://openrouter.ai/api/v1   # only needed for 'custom'
```

Stored credentials always take precedence over env vars.

## License

MIT — see [LICENSE](LICENSE).
