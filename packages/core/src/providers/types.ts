import type { z } from "zod";

export type Provider =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "deepseek"
  | "xai"
  | "zai"
  | "groq"
  | "ollama"
  | "custom";

export interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface GenericTool<T = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<T>;
  run: (input: T) => Promise<string>;
}

export interface BackendOptions {
  config: ProviderConfig;
  systemPrompt: string;
  tools: GenericTool[];
}

export interface Backend {
  ask(userMessage: string): Promise<string>;
  reset(): void;
}
