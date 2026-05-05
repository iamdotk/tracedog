import { input, password, select } from "@inquirer/prompts";
import {
  DatadogClient,
  PRESETS,
  saveCredentials,
  testAnthropicKey,
  testOpenAIKey,
  loadStoredCredentials,
  type DatadogSite,
  type Provider,
  type StoredAI,
  type StoredProviderEntry,
} from "@tracedog/core";

const SITE_CHOICES: { name: string; value: DatadogSite }[] = [
  { name: "datadoghq.com (US1 — default)", value: "datadoghq.com" },
  { name: "datadoghq.eu (EU)", value: "datadoghq.eu" },
  { name: "us3.datadoghq.com (US3)", value: "us3.datadoghq.com" },
  { name: "us5.datadoghq.com (US5)", value: "us5.datadoghq.com" },
  { name: "ap1.datadoghq.com (AP1)", value: "ap1.datadoghq.com" },
  { name: "ddog-gov.com (Gov)", value: "ddog-gov.com" },
];

export async function runSetup(): Promise<void> {
  const existing = loadStoredCredentials();

  process.stdout.write("\n👋 Welcome to tracedog — let's get you set up.\n\n");

  process.stdout.write("Step 1/2: Datadog credentials\n");
  process.stdout.write(
    "  API key:        https://app.datadoghq.com/organization-settings/api-keys\n",
  );
  process.stdout.write(
    "  Application key: https://app.datadoghq.com/personal-settings/application-keys\n\n",
  );

  const ddApiKey = await password({
    message: "Datadog API key:",
    mask: "*",
    validate: (v) => (v.trim().length > 0 ? true : "Required"),
  });
  const ddAppKey = await password({
    message: "Datadog Application key:",
    mask: "*",
    validate: (v) => (v.trim().length > 0 ? true : "Required"),
  });
  const site = (await select({
    message: "Datadog site:",
    choices: SITE_CHOICES,
    default: existing?.datadog.site ?? "datadoghq.com",
  })) as DatadogSite;

  process.stdout.write("\nTesting Datadog connection… ");
  const dd = new DatadogClient({
    apiKey: ddApiKey.trim(),
    appKey: ddAppKey.trim(),
    site,
  });
  try {
    const spans = await dd.searchSpans({ limit: 1 });
    process.stdout.write(
      `✓ reachable (${spans.length === 0 ? "no recent spans, but auth works" : "got data"})\n\n`,
    );
  } catch (err) {
    process.stderr.write(`✗ failed: ${(err as Error).message}\n`);
    process.exit(1);
  }

  process.stdout.write("Step 2/2: AI provider (optional — templated commands work without)\n\n");

  const providerChoice = (await select({
    message: "Which AI provider do you have an API key for?",
    choices: [
      ...(Object.entries(PRESETS) as [Provider, (typeof PRESETS)[Provider]][])
        .map(([k, v]) => ({
          name: `${v.label} — ${v.description}`,
          value: k as Provider | "skip",
        })),
      { name: "Skip (use templated commands only)", value: "skip" as const },
    ],
    default: "anthropic",
  })) as Provider | "skip";

  let ai: StoredAI | undefined = existing?.ai;

  if (providerChoice !== "skip") {
    const entry = await configureProvider(providerChoice, existing?.ai?.providers[providerChoice]);
    ai = {
      activeProvider: providerChoice,
      providers: {
        ...(existing?.ai?.providers ?? {}),
        [providerChoice]: entry,
      },
    };
  } else {
    process.stdout.write(
      "\nSkipping AI setup. The 'ask' and 'chat' commands won't work, but errors/slow/health/services will.\n",
    );
  }

  const path = saveCredentials({
    datadog: { apiKey: ddApiKey.trim(), appKey: ddAppKey.trim(), site },
    ai,
  });

  process.stdout.write(`\n✓ Saved to ${path} (mode 0600)\n\n`);
  process.stdout.write("Try it:\n");
  process.stdout.write("  tracedog services         # list services (no AI)\n");
  process.stdout.write("  tracedog errors --since 60\n");
  process.stdout.write("  tracedog health <service>\n");
  if (providerChoice !== "skip") {
    process.stdout.write('  tracedog ask "what services have errors right now?"\n');
    process.stdout.write("  tracedog chat\n");
  }
}

export async function configureProvider(
  provider: Provider,
  existing: StoredProviderEntry | undefined,
): Promise<StoredProviderEntry> {
  const preset = PRESETS[provider];
  process.stdout.write(`\n${preset.label}\n`);
  if (preset.signupUrl) {
    process.stdout.write(`  Get a key: ${preset.signupUrl}\n`);
  }
  if (preset.toolCallingQuality === "varies") {
    process.stdout.write(
      `  ⚠️  Tool-calling reliability varies on this provider. Pick a tool-aware model.\n`,
    );
  }
  process.stdout.write("\n");

  const apiKey = await password({
    message: `${preset.label} API key${existing ? " (Enter to keep existing)" : ""}:`,
    mask: "*",
    validate: (v) =>
      v.trim().length > 0 || existing !== undefined
        ? true
        : "Required",
  });
  const finalKey = apiKey.trim() === "" && existing ? existing.apiKey : apiKey.trim();

  let baseUrl: string | undefined;
  if (provider === "custom") {
    baseUrl = await input({
      message: "OpenAI-compatible baseUrl (e.g. https://my.proxy.example/v1):",
      default: existing?.baseUrl,
      validate: (v) => (v.trim().startsWith("http") ? true : "Must be a URL"),
    });
  } else {
    baseUrl = preset.baseUrl;
  }

  const modelExamples = preset.modelExamples.length > 0
    ? `Examples: ${preset.modelExamples.join(", ")}`
    : "Enter your model ID";
  const model = await input({
    message: `Model (default: ${preset.defaultModel || "—"}):\n   ${modelExamples}\n  `,
    default: existing?.model || preset.defaultModel,
    validate: (v) => (v.trim().length > 0 ? true : "Required"),
  });

  process.stdout.write("\nTesting connection… ");
  try {
    if (preset.isAnthropic) {
      await testAnthropicKey(finalKey);
    } else {
      await testOpenAIKey(finalKey, baseUrl);
    }
    process.stdout.write("✓ reachable\n");
  } catch (err) {
    process.stderr.write(`✗ failed: ${(err as Error).message}\n`);
    process.stderr.write("Saving anyway — you can fix this later with 'tracedog config edit'.\n");
  }

  return {
    apiKey: finalKey,
    ...(baseUrl && baseUrl !== preset.baseUrl ? { baseUrl } : {}),
    model: model.trim(),
  };
}
