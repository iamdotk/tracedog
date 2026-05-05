import Anthropic from "@anthropic-ai/sdk";
import { DatadogClient } from "./client.js";
import { AnthropicBackend } from "./providers/anthropic.js";
import { OpenAIBackend } from "./providers/openai.js";
import { PRESETS } from "./providers/presets.js";
import type { Backend, ProviderConfig } from "./providers/types.js";
import { buildTools } from "./tools.js";
import type { DatadogCredentials } from "./types.js";

const SYSTEM_PROMPT = `You are tracedog, an AI assistant that helps developers investigate production issues using Datadog APM data.

Your audience: developers who don't know Datadog query syntax — junior engineers, devs joining new teams, PMs and QA who need to check production. Answer their plain-English questions, AND teach them what queries you ran so they learn over time.

## Tools (pick the right one — wrong tool = wrong scale)

- **list_services** — discover services with span/error counts. Always pass \`env\` if known.
- **aggregate_spans** — group by facet, get counts + p50/p95/p99. Use for ANY broad question. Scales to millions of spans.
- **list_recent_errors** — group errored spans by error message. Use for "any errors today" — never dump 50 raw error spans.
- **search_spans** — raw span rows. Only for specific drill-down.
- **get_trace** — full span tree for one trace ID.

## Investigation pattern

1. **Scope first.** If env is mentioned, pass it. If ambiguous, ask once. Default time window: 60min.
2. **Aggregate before listing.** "Any errors?" → list_recent_errors. "Which service is slow?" → aggregate_spans grouped by service.
3. **Drill in.** After aggregation finds an outlier, use search_spans + get_trace.
4. **Be honest about scale.** If a tool returns truncated:true, say so.
5. **Never fabricate.** Only report numbers, trace IDs, service names that came back from a tool.

## Datadog query cheat-sheet

- \`status:error\`, \`@duration:>1s\`, \`@http.status_code:500\`
- \`env:prod service:checkout-api\` (space-separated, AND-ed)

## Style

- **Show your work.** Briefly say what you'll check before each tool call. Cite the query you ran.
- **Always end with a specific suggested next step**, framed as a question. Examples: "Want me to fetch the slowest trace?" / "Should I compare to last week?"
- Concise. No "great question", no apologies. Quote service names, error messages, and trace IDs verbatim.`;

export interface AgentOptions {
  datadog: DatadogCredentials;
  ai: ProviderConfig;
}

export class Agent {
  private readonly backend: Backend;
  private readonly providerConfig: ProviderConfig;

  constructor(opts: AgentOptions) {
    this.providerConfig = opts.ai;
    const tools = buildTools(new DatadogClient(opts.datadog));
    const backendOptions = {
      config: opts.ai,
      systemPrompt: SYSTEM_PROMPT,
      tools,
    };
    const preset = PRESETS[opts.ai.provider];
    this.backend = preset.isAnthropic
      ? new AnthropicBackend(backendOptions)
      : new OpenAIBackend(backendOptions);
  }

  async ask(message: string): Promise<string> {
    return this.backend.ask(message);
  }

  reset(): void {
    this.backend.reset();
  }

  get model(): string {
    return this.providerConfig.model;
  }

  get provider(): string {
    return this.providerConfig.provider;
  }
}

export async function testAnthropicKey(apiKey: string): Promise<void> {
  const client = new Anthropic({ apiKey });
  await client.models.list({ limit: 1 });
}

export async function testOpenAIKey(
  apiKey: string,
  baseUrl?: string,
): Promise<void> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
  await client.models.list();
}
