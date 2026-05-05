import { DatadogClient, loadOrEnv } from "@tracedog/core";
import { ms, table } from "../table.js";

export interface HealthOptions {
  service: string;
  env?: string;
  sinceMinutes: number;
}

export async function runHealth(opts: HealthOptions): Promise<void> {
  const dd = new DatadogClient(loadOrEnv().datadog);
  const to = new Date();
  const from = new Date(to.getTime() - opts.sinceMinutes * 60_000);

  const totals = await dd.aggregateSpans({
    groupBy: ["service"],
    service: opts.service,
    env: opts.env,
    from,
    to,
    bucketLimit: 1,
  });
  const errors = await dd.aggregateSpans({
    groupBy: ["service"],
    query: "status:error",
    service: opts.service,
    env: opts.env,
    from,
    to,
    bucketLimit: 1,
    percentiles: [],
  });
  const topResources = await dd.aggregateSpans({
    groupBy: ["resource_name"],
    service: opts.service,
    env: opts.env,
    from,
    to,
    bucketLimit: 5,
  });

  const total = totals.buckets[0]?.count ?? 0;
  const errCount = errors.buckets[0]?.count ?? 0;
  const errRate = total === 0 ? 0 : (errCount / total) * 100;

  process.stdout.write(
    `Health for ${opts.service}${opts.env ? ` (env=${opts.env})` : ""} over last ${opts.sinceMinutes}m\n\n`,
  );
  process.stdout.write(
    `  Spans:        ${total.toLocaleString()}\n` +
      `  Errors:       ${errCount.toLocaleString()} (${errRate.toFixed(2)}%)\n` +
      `  p50 latency:  ${ms(totals.buckets[0]?.p50)}\n` +
      `  p95 latency:  ${ms(totals.buckets[0]?.p95)}\n` +
      `  p99 latency:  ${ms(totals.buckets[0]?.p99)}\n\n`,
  );

  if (topResources.buckets.length > 0) {
    process.stdout.write("Top resources by traffic:\n\n");
    process.stdout.write(
      table(
        topResources.buckets.map((b) => ({
          resource: b.groups.resource_name ?? "(unknown)",
          count: b.count ?? 0,
          p50: ms(b.p50),
          p95: ms(b.p95),
        })),
      ),
    );
  }
}
