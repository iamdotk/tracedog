import { select } from "@inquirer/prompts";
import {
  configPath,
  isValidProvider,
  loadStoredCredentials,
  PRESETS,
  saveCredentials,
  type Provider,
} from "@tracedog/core";
import { configureProvider, runSetup } from "./setup.js";

export async function runConfig(
  action: string | undefined,
  ...args: string[]
): Promise<void> {
  switch (action) {
    case undefined:
    case "show":
      return showConfig();
    case "path":
      process.stdout.write(configPath() + "\n");
      return;
    case "edit":
      await runSetup();
      return;
    case "set-provider":
      await setProvider(args[0]);
      return;
    case "set-model":
      await setModel(args[0]);
      return;
    default:
      throw new Error(
        `unknown config action: ${action}\n` +
          "valid: show | path | edit | set-provider <name> | set-model <id>",
      );
  }
}

function showConfig(): void {
  const creds = loadStoredCredentials();
  if (!creds) {
    process.stdout.write(
      `No stored credentials at ${configPath()}.\nRun 'tracedog setup' to create one.\n`,
    );
    return;
  }
  process.stdout.write(`Config: ${configPath()}\n\n`);
  process.stdout.write(`Datadog\n`);
  process.stdout.write(`  API key:  ${mask(creds.datadog.apiKey)}\n`);
  process.stdout.write(`  App key:  ${mask(creds.datadog.appKey)}\n`);
  process.stdout.write(`  Site:     ${creds.datadog.site}\n\n`);

  if (!creds.ai) {
    process.stdout.write("AI: not configured (templated commands only)\n");
    return;
  }
  process.stdout.write(`AI\n`);
  process.stdout.write(`  Active provider: ${creds.ai.activeProvider}\n`);
  process.stdout.write(`  Configured providers:\n`);
  for (const [provider, entry] of Object.entries(creds.ai.providers)) {
    if (!entry) continue;
    process.stdout.write(
      `    - ${provider}${provider === creds.ai.activeProvider ? " (active)" : ""}: ${mask(entry.apiKey)}, model=${entry.model}${entry.baseUrl ? `, baseUrl=${entry.baseUrl}` : ""}\n`,
    );
  }
  process.stdout.write(`\nSaved: ${creds.savedAt}\n`);
}

async function setProvider(value: string | undefined): Promise<void> {
  const creds = loadStoredCredentials();
  if (!creds) {
    throw new Error("No stored credentials. Run 'tracedog setup' first.");
  }

  let provider: Provider;
  if (value && isValidProvider(value)) {
    provider = value;
  } else if (value === undefined) {
    provider = (await select({
      message: "Pick active provider:",
      choices: (Object.keys(PRESETS) as Provider[]).map((p) => ({
        name: `${PRESETS[p].label}${creds.ai?.providers[p] ? " (configured)" : ""}`,
        value: p,
      })),
      default: creds.ai?.activeProvider,
    })) as Provider;
  } else {
    throw new Error(`unknown provider: ${value}`);
  }

  let entry = creds.ai?.providers[provider];
  if (!entry) {
    process.stdout.write(`No key stored for ${provider}. Let's configure it.\n`);
    entry = await configureProvider(provider, undefined);
  }

  saveCredentials({
    datadog: creds.datadog,
    ai: {
      activeProvider: provider,
      providers: {
        ...(creds.ai?.providers ?? {}),
        [provider]: entry,
      },
    },
  });
  process.stdout.write(`✓ Active provider set to ${provider} (model: ${entry.model}).\n`);
}

async function setModel(value: string | undefined): Promise<void> {
  const creds = loadStoredCredentials();
  if (!creds?.ai) {
    throw new Error("No AI provider configured. Run 'tracedog setup' first.");
  }
  if (!value) throw new Error("set-model: model ID required, e.g. 'set-model claude-opus-4-7'");

  const provider = creds.ai.activeProvider;
  const entry = creds.ai.providers[provider];
  if (!entry) throw new Error(`Active provider ${provider} has no stored key.`);

  saveCredentials({
    datadog: creds.datadog,
    ai: {
      ...creds.ai,
      providers: {
        ...creds.ai.providers,
        [provider]: { ...entry, model: value },
      },
    },
  });
  process.stdout.write(`✓ Model for ${provider} set to ${value}.\n`);
}

function mask(key: string): string {
  if (key.length <= 8) return "********";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
