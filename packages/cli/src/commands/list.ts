import { DatadogClient, formatSpanLine } from "@iamdotk/tracedog-core";
import { loadCredentials } from "../config.js";

export interface ListOptions {
  service?: string;
  query?: string;
  limit: number;
  sinceMinutes: number;
}

export async function runList(opts: ListOptions): Promise<void> {
  const client = new DatadogClient(loadCredentials());
  const to = new Date();
  const from = new Date(to.getTime() - opts.sinceMinutes * 60 * 1000);
  const spans = await client.searchSpans({
    service: opts.service,
    query: opts.query,
    from,
    to,
    limit: opts.limit,
  });
  if (spans.length === 0) {
    process.stderr.write("No spans found.\n");
    return;
  }
  for (const s of spans) process.stdout.write(formatSpanLine(s) + "\n");
}
