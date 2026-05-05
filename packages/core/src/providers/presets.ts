import type { Provider } from "./types.js";

export interface ProviderPreset {
  label: string;
  description: string;
  baseUrl?: string;
  isAnthropic: boolean;
  defaultModel: string;
  modelExamples: string[];
  signupUrl: string;
  toolCallingQuality: "excellent" | "good" | "varies";
}

export const PRESETS: Record<Provider, ProviderPreset> = {
  anthropic: {
    label: "Anthropic (Claude)",
    description: "Recommended. Best tool-calling.",
    isAnthropic: true,
    defaultModel: "claude-sonnet-4-6",
    modelExamples: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    signupUrl: "https://console.anthropic.com/settings/keys",
    toolCallingQuality: "excellent",
  },
  openai: {
    label: "OpenAI (GPT)",
    description: "GPT-5 and o-series. Excellent tool-calling.",
    isAnthropic: false,
    defaultModel: "gpt-5",
    modelExamples: ["gpt-5", "gpt-5-mini", "o1"],
    signupUrl: "https://platform.openai.com/api-keys",
    toolCallingQuality: "excellent",
  },
  openrouter: {
    label: "OpenRouter",
    description: "One key, 50+ models including Claude/GPT/Grok/Gemini.",
    baseUrl: "https://openrouter.ai/api/v1",
    isAnthropic: false,
    defaultModel: "anthropic/claude-sonnet-4.6",
    modelExamples: [
      "anthropic/claude-sonnet-4.6",
      "openai/gpt-5",
      "x-ai/grok-4",
      "google/gemini-2.5-pro",
    ],
    signupUrl: "https://openrouter.ai/keys",
    toolCallingQuality: "excellent",
  },
  deepseek: {
    label: "DeepSeek",
    description: "Cheap and capable. V3 / R1.",
    baseUrl: "https://api.deepseek.com/v1",
    isAnthropic: false,
    defaultModel: "deepseek-chat",
    modelExamples: ["deepseek-chat", "deepseek-reasoner"],
    signupUrl: "https://platform.deepseek.com/api_keys",
    toolCallingQuality: "good",
  },
  xai: {
    label: "xAI (Grok)",
    description: "Grok 4.",
    baseUrl: "https://api.x.ai/v1",
    isAnthropic: false,
    defaultModel: "grok-4",
    modelExamples: ["grok-4", "grok-3"],
    signupUrl: "https://console.x.ai",
    toolCallingQuality: "good",
  },
  zai: {
    label: "Z.ai (GLM)",
    description: "GLM-4.5 / 4.6.",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    isAnthropic: false,
    defaultModel: "glm-4.5",
    modelExamples: ["glm-4.5", "glm-4-plus"],
    signupUrl: "https://open.bigmodel.cn",
    toolCallingQuality: "good",
  },
  groq: {
    label: "Groq",
    description: "Extremely fast inference. Tool-calling varies by model.",
    baseUrl: "https://api.groq.com/openai/v1",
    isAnthropic: false,
    defaultModel: "llama-3.3-70b-versatile",
    modelExamples: [
      "llama-3.3-70b-versatile",
      "deepseek-r1-distill-llama-70b",
    ],
    signupUrl: "https://console.groq.com/keys",
    toolCallingQuality: "varies",
  },
  ollama: {
    label: "Ollama (local)",
    description: "Free local models. Tool-calling varies — pick a tool-aware model.",
    baseUrl: "http://localhost:11434/v1",
    isAnthropic: false,
    defaultModel: "llama3.3",
    modelExamples: ["llama3.3", "qwen2.5-coder:32b"],
    signupUrl: "https://ollama.com/download",
    toolCallingQuality: "varies",
  },
  custom: {
    label: "Custom OpenAI-compatible",
    description: "Bring your own baseUrl + key.",
    isAnthropic: false,
    defaultModel: "",
    modelExamples: [],
    signupUrl: "",
    toolCallingQuality: "varies",
  },
};

export function isValidProvider(value: string): value is Provider {
  return Object.keys(PRESETS).includes(value);
}
