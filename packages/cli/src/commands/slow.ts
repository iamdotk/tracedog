import { DatadogClient, loadOrEnv } from "@iamdotk/tracedog-core";
import { ms, table } from "../table.js";

export interface SlowOptions {
  service?: string;
  env?: string;
  sinceMinutes: number;
  limit: number;
}

export async function runSlow(opts: SlowOptions): Promise<void> {
  const dd = new DatadogClient(loadOrEnv().datadog);
  const to = new Date();
  const from = new Date(to.getTime() - opts.sinceMinutes * 60_000);

  const groupBy = opts.service
    ? (["resource_name"] as const)
    : (["service"] as const);

  const agg = await dd.aggregateSpans({
    groupBy: [...groupBy],
    service: opts.service,
    env: opts.env,
    from,
    to,
    bucketLimit: opts.limit,
  });

  if (agg.buckets.length === 0) {
    process.stdout.write("No spans found.\n");
    return;
  }

  const rows = agg.buckets
    .sort((a, b) => (b.p95 ?? 0) - (a.p95 ?? 0))
    .map((b) => ({
      [opts.service ? "resource" : "service"]:
        b.groups[opts.service ? "resource_name" : "service"] ?? "(unknown)",
      count: b.count ?? 0,
      p50: ms(b.p50),
      p95: ms(b.p95),
      p99: ms(b.p99),
    }));

  process.stdout.write(
    `Slowest ${opts.service ? "resources in " + opts.service : "services"} over last ${opts.sinceMinutes}m${opts.env ? ` in ${opts.env}` : ""} (sorted by p95):\n\n`,
  );
  process.stdout.write(table(rows));
}
