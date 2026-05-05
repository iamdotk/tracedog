import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { z } from "zod";
import type { Backend, BackendOptions, GenericTool } from "./types.js";

const MAX_ITERATIONS = 30;

export class OpenAIBackend implements Backend {
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly toolMap: Map<string, GenericTool>;
  private readonly toolDefs: ChatCompletionTool[];
  private readonly history: ChatCompletionMessageParam[] = [];

  constructor(opts: BackendOptions) {
    this.openai = new OpenAI({
      apiKey: opts.config.apiKey,
      ...(opts.config.baseUrl ? { baseURL: opts.config.baseUrl } : {}),
    });
    this.model = opts.config.model;
    this.systemPrompt = opts.systemPrompt;
    this.toolMap = new Map(opts.tools.map((t) => [t.name, t]));
    this.toolDefs = opts.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: z.toJSONSchema(t.inputSchema) as Record<string, unknown>,
      },
    }));
  }

  async ask(userMessage: string): Promise<string> {
    if (this.history.length === 0) {
      this.history.push({ role: "system", content: this.systemPrompt });
    }
    this.history.push({ role: "user", content: userMessage });

    for (let i = 0; i < MAX_ITERATIONS; i += 1) {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: this.history,
        tools: this.toolDefs,
      });
      const message = response.choices[0]?.message;
      if (!message) throw new Error("provider returned no message");
      this.history.push(message);

      const toolCalls = message.tool_calls ?? [];
      const functionCalls = toolCalls.filter(
        (c): c is Extract<typeof c, { type: "function" }> =>
          c.type === "function",
      );

      if (functionCalls.length === 0) {
        return message.content ?? "";
      }

      for (const call of functionCalls) {
        const tool = this.toolMap.get(call.function.name);
        const toolResult = await runTool(tool, call.function.arguments);
        this.history.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolResult,
        });
      }
    }
    throw new Error(
      `agent exceeded ${MAX_ITERATIONS} tool-call iterations — model may be looping`,
    );
  }

  reset(): void {
    this.history.length = 0;
  }
}

async function runTool(
  tool: GenericTool | undefined,
  argsJson: string,
): Promise<string> {
  if (!tool) return `error: unknown tool`;
  let parsed: unknown;
  try {
    parsed = argsJson.trim() === "" ? {} : JSON.parse(argsJson);
  } catch {
    return `error: tool arguments were not valid JSON`;
  }
  try {
    return await tool.run(parsed);
  } catch (err) {
    return `error: ${(err as Error).message}`;
  }
}
