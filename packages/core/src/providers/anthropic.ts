import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages.js";
import type { Backend, BackendOptions, GenericTool } from "./types.js";

export class AnthropicBackend implements Backend {
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly tools: ReturnType<typeof toAnthropicTool>[];
  private readonly history: BetaMessageParam[] = [];

  constructor(opts: BackendOptions) {
    this.anthropic = new Anthropic({
      apiKey: opts.config.apiKey,
      ...(opts.config.baseUrl ? { baseURL: opts.config.baseUrl } : {}),
    });
    this.model = opts.config.model;
    this.systemPrompt = opts.systemPrompt;
    this.tools = opts.tools.map(toAnthropicTool);
  }

  async ask(userMessage: string): Promise<string> {
    this.history.push({ role: "user", content: userMessage });

    const isHaiku = this.model.includes("haiku");
    const baseParams = {
      model: this.model,
      max_tokens: 16000,
      system: [
        {
          type: "text" as const,
          text: this.systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      tools: this.tools,
      messages: this.history,
    };

    const params = isHaiku
      ? baseParams
      : {
          ...baseParams,
          thinking: { type: "adaptive" as const },
          output_config: {
            effort: this.model.includes("opus")
              ? ("xhigh" as const)
              : ("high" as const),
          },
        };

    const runner = this.anthropic.beta.messages.toolRunner(params);
    const final = await runner.done();
    this.history.push({ role: "assistant", content: final.content });

    return final.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter((s) => s.length > 0)
      .join("\n");
  }

  reset(): void {
    this.history.length = 0;
  }
}

function toAnthropicTool(tool: GenericTool) {
  return betaZodTool({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    run: tool.run,
  });
}
