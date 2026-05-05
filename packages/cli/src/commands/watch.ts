import { DatadogClient, formatSpanLine } from "@iamdotk/tracedog-core";
import { loadCredentials } from "../config.js";

export interface WatchOptions {
  service: string;
  intervalMs: number;
}

export async function runWatch(opts: WatchOptions): Promise<void> {
  const client = new DatadogClient(loadCredentials());
  const seen = new Set<string>();
  let cursor = new Date(Date.now() - 60_000);

  process.stderr.write(`Watching ${opts.service} (Ctrl+C to stop)…\n`);

  for (;;) {
    const to = new Date();
    const spans = await client.searchSpans({
      service: opts.service,
      from: cursor,
      to,
      limit: 200,
    });
    for (const s of spans) {
      if (seen.has(s.spanId)) continue;
      seen.add(s.spanId);
      process.stdout.write(formatSpanLine(s) + "\n");
    }
    cursor = to;
    await sleep(opts.intervalMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
