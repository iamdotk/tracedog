import { activeAIConfig, Agent, loadOrEnv, type Provider } from "@tracedog/core";

export interface AskOptions {
  question: string;
  provider?: Provider;
}

export async function runAsk(opts: AskOptions): Promise<void> {
  const creds = loadOrEnv();
  const aiConfig = activeAIConfig(creds, opts.provider);
  if (!aiConfig) {
    throw new Error(
      opts.provider
        ? `No stored key for provider '${opts.provider}'. Run 'tracedog config set-provider ${opts.provider}'.`
        : "AI commands need a provider configured. Run 'tracedog setup' or 'tracedog config edit'.",
    );
  }
  const agent = new Agent({ datadog: creds.datadog, ai: aiConfig });
  const reply = await agent.ask(opts.question);
  process.stdout.write(reply + "\n");
}
