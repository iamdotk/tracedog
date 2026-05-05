import { DatadogClient, loadOrEnv } from "@tracedog/core";
import { table } from "../table.js";

export interface ServicesOptions {
  env?: string;
  sinceMinutes: number;
  limit: number;
}

export async function runServices(opts: ServicesOptions): Promise<void> {
  const dd = new DatadogClient(loadOrEnv().datadog);
  const to = new Date();
  const from = new Date(to.getTime() - opts.sinceMinutes * 60_000);

  const totals = await dd.aggregateSpans({
    groupBy: ["service"],
    env: opts.env,
    from,
    to,
    bucketLimit: opts.limit,
    percentiles: [],
  });
  const errors = await dd.aggregateSpans({
    groupBy: ["service"],
    query: "status:error",
    env: opts.env,
    from,
    to,
    bucketLimit: opts.limit,
    percentiles: [],
  });
  const errMap = new Map<string, number>();
  for (const b of errors.buckets) {
    if (b.groups.service) errMap.set(b.groups.service, b.count ?? 0);
  }

  if (totals.buckets.length === 0) {
    process.stdout.write("No services found in the time window.\n");
    return;
  }

  const rows = totals.buckets.map((b) => {
    const svc = b.groups.service ?? "(unknown)";
    const total = b.count ?? 0;
    const err = errMap.get(svc) ?? 0;
    return {
      service: svc,
      spans: total,
      errors: err,
      "error %": total === 0 ? "—" : ((err / total) * 100).toFixed(2),
    };
  });

  process.stdout.write(
    `Services with traffic in last ${opts.sinceMinutes}m${opts.env ? ` (env=${opts.env})` : ""}:\n\n`,
  );
  process.stdout.write(table(rows));
}
