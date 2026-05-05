import { input } from "@inquirer/prompts";
import { activeAIConfig, Agent, loadOrEnv, type Provider } from "@iamdotk/tracedog-core";

export interface ChatOptions {
  provider?: Provider;
}

export async function runChat(opts: ChatOptions): Promise<void> {
  const creds = loadOrEnv();
  const aiConfig = activeAIConfig(creds, opts.provider);
  if (!aiConfig) {
    throw new Error(
      "AI commands need a provider configured. Run 'tracedog setup' or 'tracedog config edit'.",
    );
  }
  const agent = new Agent({ datadog: creds.datadog, ai: aiConfig });

  process.stdout.write(
    `tracedog chat (${agent.provider}/${agent.model}) — ask anything. /exit, /reset to clear context.\n\n`,
  );

  for (;;) {
    let question: string;
    try {
      question = await input({ message: "you ›" });
    } catch {
      return;
    }
    const trimmed = question.trim();
    if (!trimmed) continue;
    if (trimmed === "/exit" || trimmed === "/quit") return;
    if (trimmed === "/reset") {
      agent.reset();
      process.stdout.write("(context cleared)\n\n");
      continue;
    }
    try {
      const reply = await agent.ask(trimmed);
      process.stdout.write(`\n${reply}\n\n`);
    } catch (err) {
      process.stderr.write(`error: ${(err as Error).message}\n\n`);
    }
  }
}
