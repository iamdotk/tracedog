import { isValidProvider, type Provider } from "@iamdotk/tracedog-core";
import { runAsk } from "./commands/ask.js";
import { runChat } from "./commands/chat.js";
import { runConfig } from "./commands/config.js";
import { runErrors } from "./commands/errors.js";
import { runHealth } from "./commands/health.js";
import { runList } from "./commands/list.js";
import { runServices } from "./commands/services.js";
import { runSetup } from "./commands/setup.js";
import { runShow } from "./commands/show.js";
import { runSlow } from "./commands/slow.js";
import { runWatch } from "./commands/watch.js";

const HELP = `tracedog — Datadog APM from your terminal

Setup & config:
  tracedog setup                            Interactive wizard (Datadog + optional AI provider)
  tracedog config show                      Show config (masked)
  tracedog config path                      Print path to credentials file
  tracedog config edit                      Re-run setup
  tracedog config set-provider <name>       Switch active provider (asks for key if new)
  tracedog config set-model <id>            Change model for active provider

Templated commands (fast, no AI key needed):
  tracedog services [--env prod] [--since 60] [--limit 50]
  tracedog errors   [--service X] [--env prod] [--since 60] [--limit 20]
  tracedog slow     [--service X] [--env prod] [--since 60] [--limit 20]
  tracedog health   <service> [--env prod] [--since 60]

AI agent (uses any configured provider — Anthropic, OpenAI, OpenRouter, DeepSeek, Grok, Z.ai, Groq, Ollama, custom):
  tracedog ask "<question>" [--provider <name>]
  tracedog chat [--provider <name>]

Direct (raw spans):
  tracedog list  [--service X] [--query Q] [--limit 50] [--since 15]
  tracedog show  <trace-id>
  tracedog watch --service X [--interval 5000]

Auth precedence: ~/.tracedog/credentials.json → env vars
Env vars: DD_API_KEY, DD_APP_KEY, DD_SITE; ANTHROPIC_API_KEY or OPENAI_API_KEY, optional TRACEDOG_PROVIDER + TRACEDOG_MODEL + TRACEDOG_BASE_URL.
`;

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  try {
    switch (cmd) {
      case "setup":
        await runSetup();
        return 0;
      case "config":
        await runConfig(rest[0], ...rest.slice(1));
        return 0;
      case "services":
        await runServices({
          env: flag(rest, "--env"),
          sinceMinutes: numFlag(rest, "--since", 60),
          limit: numFlag(rest, "--limit", 50),
        });
        return 0;
      case "errors":
        await runErrors({
          service: flag(rest, "--service"),
          env: flag(rest, "--env"),
          sinceMinutes: numFlag(rest, "--since", 60),
          limit: numFlag(rest, "--limit", 20),
        });
        return 0;
      case "slow":
        await runSlow({
          service: flag(rest, "--service"),
          env: flag(rest, "--env"),
          sinceMinutes: numFlag(rest, "--since", 60),
          limit: numFlag(rest, "--limit", 20),
        });
        return 0;
      case "health": {
        const service = rest[0];
        if (!service || service.startsWith("--")) {
          throw new Error(
            "health: <service> required, e.g. tracedog health checkout-api",
          );
        }
        await runHealth({
          service,
          env: flag(rest, "--env"),
          sinceMinutes: numFlag(rest, "--since", 60),
        });
        return 0;
      }
      case "ask": {
        const question = positionalArgs(rest, ["--provider"]).join(" ").trim();
        if (!question) throw new Error("ask: question required");
        await runAsk({
          question,
          provider: parseProvider(flag(rest, "--provider")),
        });
        return 0;
      }
      case "chat":
        await runChat({ provider: parseProvider(flag(rest, "--provider")) });
        return 0;
      case "list":
        await runList({
          service: flag(rest, "--service"),
          query: flag(rest, "--query"),
          limit: numFlag(rest, "--limit", 50),
          sinceMinutes: numFlag(rest, "--since", 15),
        });
        return 0;
      case "show": {
        const id = rest[0];
        if (!id) throw new Error("show: trace-id required");
        await runShow(id);
        return 0;
      }
      case "watch": {
        const service = flag(rest, "--service");
        if (!service) throw new Error("watch: --service required");
        await runWatch({
          service,
          intervalMs: numFlag(rest, "--interval", 5000),
        });
        return 0;
      }
      case "--help":
      case "-h":
      case "help":
      case undefined:
        process.stdout.write(HELP);
        return 0;
      default:
        process.stderr.write(`unknown command: ${cmd}\n${HELP}`);
        return 2;
    }
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`);
    return 1;
  }
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function numFlag(args: string[], name: string, defaultValue: number): number {
  const v = flag(args, name);
  if (v === undefined) return defaultValue;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`${name}: expected number, got ${v}`);
  return n;
}

function parseProvider(v: string | undefined): Provider | undefined {
  if (v === undefined) return undefined;
  if (!isValidProvider(v)) {
    throw new Error(
      `--provider must be one of: anthropic, openai, openrouter, deepseek, xai, zai, groq, ollama, custom (got ${v})`,
    );
  }
  return v;
}

function positionalArgs(args: string[], flagsWithValue: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (flagsWithValue.includes(arg)) {
      i += 1; // skip the value
      continue;
    }
    if (arg.startsWith("--")) continue;
    out.push(arg);
  }
  return out;
}
