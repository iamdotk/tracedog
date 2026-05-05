import { DatadogClient, loadOrEnv } from "@tracedog/core";
import { table } from "../table.js";

export interface ErrorsOptions {
  service?: string;
  env?: string;
  sinceMinutes: number;
  limit: number;
}

export async function runErrors(opts: ErrorsOptions): Promise<void> {
  const dd = new DatadogClient(loadOrEnv().datadog);
  const to = new Date();
  const from = new Date(to.getTime() - opts.sinceMinutes * 60_000);

  const agg = await dd.aggregateSpans({
    groupBy: ["@error.message", "service"],
    query: "status:error",
    service: opts.service,
    env: opts.env,
    from,
    to,
    bucketLimit: opts.limit,
    percentiles: [],
  });

  if (agg.buckets.length === 0) {
    process.stdout.write(
      `No errors in ${opts.sinceMinutes}m${opts.env ? ` (env=${opts.env})` : ""}${opts.service ? ` (service=${opts.service})` : ""}.\n`,
    );
    return;
  }

  const rows = agg.buckets.map((b) => ({
    count: b.count ?? 0,
    service: b.groups.service ?? "(any)",
    error: truncate(b.groups["@error.message"] ?? "(unknown)", 80),
  }));

  process.stdout.write(
    `Errors over last ${opts.sinceMinutes}m${opts.env ? ` in ${opts.env}` : ""}:\n\n`,
  );
  process.stdout.write(table(rows));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
