import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isValidProvider, PRESETS } from "./providers/presets.js";
import type { Provider, ProviderConfig } from "./providers/types.js";
import type { DatadogCredentials, DatadogSite } from "./types.js";

export interface StoredProviderEntry {
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface StoredAI {
  activeProvider: Provider;
  providers: Partial<Record<Provider, StoredProviderEntry>>;
}

export interface StoredCredentials {
  datadog: DatadogCredentials;
  ai?: StoredAI;
  savedAt: string;
}

const DEFAULT_PATH = join(homedir(), ".tracedog", "credentials.json");

export function configPath(): string {
  return process.env.TRACEDOG_CONFIG ?? DEFAULT_PATH;
}

export function load(): StoredCredentials | null {
  const path = configPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const datadog = parsed.datadog as DatadogCredentials | undefined;
    if (!datadog?.apiKey) return null;
    return {
      datadog,
      ai: normalizeAI(parsed),
      savedAt: (parsed.savedAt as string) ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function save(creds: Omit<StoredCredentials, "savedAt">): string {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const payload: StoredCredentials = {
    ...creds,
    savedAt: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(payload, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

export function loadOrEnv(): StoredCredentials {
  const stored = load();
  if (stored) return stored;
  const fromEnv = envCredentials();
  if (fromEnv) return fromEnv;
  throw new Error(
    `No Datadog credentials found. Run 'tracedog setup' to configure, or set env vars (DD_API_KEY, DD_APP_KEY, optional DD_SITE).`,
  );
}

export function activeAIConfig(
  creds: StoredCredentials,
  providerOverride?: Provider,
): ProviderConfig | null {
  if (!creds.ai) return null;
  const provider = providerOverride ?? creds.ai.activeProvider;
  const entry = creds.ai.providers[provider];
  if (!entry?.apiKey) return null;
  const preset = PRESETS[provider];
  return {
    provider,
    apiKey: entry.apiKey,
    baseUrl: entry.baseUrl ?? preset.baseUrl,
    model: entry.model || preset.defaultModel,
  };
}

function normalizeAI(parsed: Record<string, unknown>): StoredAI | undefined {
  if (parsed.ai && typeof parsed.ai === "object") {
    const ai = parsed.ai as StoredAI;
    if (
      ai.activeProvider &&
      isValidProvider(ai.activeProvider) &&
      ai.providers
    ) {
      return ai;
    }
  }
  // Migrate legacy schema: { anthropic: { apiKey }, model: "opus"|"sonnet"|"haiku" }
  const legacyAnthropic = parsed.anthropic as { apiKey?: string } | undefined;
  if (legacyAnthropic?.apiKey && legacyAnthropic.apiKey !== "(unset)") {
    const legacyModel = parsed.model as string | undefined;
    const modelId =
      legacyModel === "opus"
        ? "claude-opus-4-7"
        : legacyModel === "haiku"
          ? "claude-haiku-4-5"
          : "claude-sonnet-4-6";
    return {
      activeProvider: "anthropic",
      providers: {
        anthropic: { apiKey: legacyAnthropic.apiKey, model: modelId },
      },
    };
  }
  return undefined;
}

function envCredentials(): StoredCredentials | null {
  const ddKey = process.env.DD_API_KEY;
  const ddApp = process.env.DD_APP_KEY ?? process.env.DD_APPLICATION_KEY;
  if (!ddKey || !ddApp) return null;
  const ai = aiFromEnv();
  return {
    datadog: {
      apiKey: ddKey,
      appKey: ddApp,
      site: (process.env.DD_SITE as DatadogSite) ?? "datadoghq.com",
    },
    ai,
    savedAt: "(env)",
  };
}

function aiFromEnv(): StoredAI | undefined {
  const provider = process.env.TRACEDOG_PROVIDER as Provider | undefined;
  if (provider && isValidProvider(provider)) {
    const apiKey = process.env.TRACEDOG_API_KEY ?? "";
    if (!apiKey) return undefined;
    const preset = PRESETS[provider];
    return {
      activeProvider: provider,
      providers: {
        [provider]: {
          apiKey,
          baseUrl: process.env.TRACEDOG_BASE_URL ?? preset.baseUrl,
          model: process.env.TRACEDOG_MODEL ?? preset.defaultModel,
        },
      },
    };
  }
  // Backward-compat: ANTHROPIC_API_KEY → anthropic provider
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      activeProvider: "anthropic",
      providers: {
        anthropic: {
          apiKey: anthropicKey,
          model:
            process.env.TRACEDOG_MODEL ?? PRESETS.anthropic.defaultModel,
        },
      },
    };
  }
  // Backward-compat: OPENAI_API_KEY → openai provider
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      activeProvider: "openai",
      providers: {
        openai: {
          apiKey: openaiKey,
          model: process.env.TRACEDOG_MODEL ?? PRESETS.openai.defaultModel,
        },
      },
    };
  }
  return undefined;
}
