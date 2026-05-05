import { z } from "zod";
import type { DatadogClient } from "./client.js";
import { formatTraceTree } from "./formatter.js";
import type { GenericTool } from "./providers/types.js";

const ENV_DESC =
  "Environment tag, e.g. 'prod', 'staging'. Strongly recommended at scale — without it you'll mix prod and staging data.";

const SINCE_DESC = "Lookback window in minutes (1–1440). Default 60.";

export function buildTools(dd: DatadogClient): GenericTool[] {
  return [
    listServicesTool(dd),
    searchSpansTool(dd),
    aggregateSpansTool(dd),
    listRecentErrorsTool(dd),
    getTraceTool(dd),
  ];
}

function listServicesTool(dd: DatadogClient): GenericTool {
  const schema = z.object({
    env: z.string().optional().describe(ENV_DESC),
    sinceMinutes: z.number().min(1).max(1440).default(60).describe(SINCE_DESC),
    limit: z.number().min(1).max(200).default(50),
  });
  return {
    name: "list_services",
    description:
      "List Datadog services with span and error counts. Uses the aggregate API — accurate even with thousands of services. Pass `env` to scope.",
    inputSchema: schema,
    run: async (input) => {
      const { env, sinceMinutes, limit } = schema.parse(input);
      const to = new Date();
      const from = new Date(to.getTime() - sinceMinutes * 60_000);
      const totals = await dd.aggregateSpans({
        env,
        from,
        to,
        groupBy: ["service"],
        bucketLimit: limit,
        percentiles: [],
      });
      const errors = await dd.aggregateSpans({
        env,
        query: "status:error",
        from,
        to,
        groupBy: ["service"],
        bucketLimit: limit,
        percentiles: [],
      });
      const errMap = new Map<string, number>();
      for (const b of errors.buckets) {
        if (b.groups.service) errMap.set(b.groups.service, b.count ?? 0);
      }
      const services = totals.buckets
        .map((b) => ({
          service: b.groups.service ?? "(unknown)",
          spanCount: b.count ?? 0,
          errorCount: errMap.get(b.groups.service ?? "") ?? 0,
        }))
        .sort((a, b) => b.spanCount - a.spanCount);
      return JSON.stringify(
        {
          window: `${sinceMinutes}m`,
          env: env ?? "(all envs — consider passing env)",
          services,
          truncated: services.length >= limit,
        },
        null,
        2,
      );
    },
  };
}

function searchSpansTool(dd: DatadogClient): GenericTool {
  const schema = z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Datadog query, e.g. 'status:error', '@http.status_code:500', '@duration:>1s'.",
      ),
    service: z.string().optional(),
    env: z.string().optional().describe(ENV_DESC),
    sinceMinutes: z.number().min(1).max(1440).default(15),
    limit: z.number().min(1).max(200).default(20),
  });
  return {
    name: "search_spans",
    description:
      "Search Datadog spans (raw rows). Use this for specific lookups. For broad questions like 'any errors lately', prefer aggregate_spans or list_recent_errors.",
    inputSchema: schema,
    run: async (input) => {
      const { query, service, env, sinceMinutes, limit } = schema.parse(input);
      const to = new Date();
      const from = new Date(to.getTime() - sinceMinutes * 60_000);
      const result = await dd.searchSpansWithMeta({
        query,
        service,
        env,
        from,
        to,
        limit,
      });
      return JSON.stringify(
        {
          window: `${sinceMinutes}m`,
          query: query ?? "(all)",
          service: service ?? "(any)",
          env: env ?? "(any)",
          returned: result.spans.length,
          truncated: result.truncated,
          truncationNote: result.truncated
            ? `Hit limit ${limit}. Narrow the query or shrink the time window.`
            : undefined,
          spans: result.spans.map((s) => ({
            traceId: s.traceId,
            spanId: s.spanId,
            service: s.service,
            operation: s.operation,
            resource: s.resource,
            status: s.status,
            durationMs: round(s.durationMs),
            startedAt: new Date(s.startMs).toISOString(),
          })),
        },
        null,
        2,
      );
    },
  };
}

function aggregateSpansTool(dd: DatadogClient): GenericTool {
  const schema = z.object({
    groupBy: z
      .array(
        z.enum([
          "service",
          "resource_name",
          "operation_name",
          "env",
          "status",
          "@error.message",
          "@error.type",
          "@http.status_code",
        ]),
      )
      .min(1)
      .max(3)
      .describe("Facets to group by."),
    query: z.string().optional(),
    service: z.string().optional(),
    env: z.string().optional().describe(ENV_DESC),
    sinceMinutes: z.number().min(1).max(1440).default(60),
    limit: z.number().min(1).max(100).default(20),
  });
  return {
    name: "aggregate_spans",
    description:
      "Group spans by facet(s) and return counts + p50/p95/p99 latency per group. Use this for 'which services are slowest', 'compare error rates', etc. Scales to millions of spans.",
    inputSchema: schema,
    run: async (input) => {
      const { groupBy, query, service, env, sinceMinutes, limit } =
        schema.parse(input);
      const to = new Date();
      const from = new Date(to.getTime() - sinceMinutes * 60_000);
      const agg = await dd.aggregateSpans({
        groupBy,
        query,
        service,
        env,
        from,
        to,
        bucketLimit: limit,
      });
      return JSON.stringify(
        {
          window: `${sinceMinutes}m`,
          groupBy,
          filter: { query, service, env },
          buckets: agg.buckets.map((b) => ({
            groups: b.groups,
            count: b.count ?? 0,
            p50ms: round(b.p50),
            p95ms: round(b.p95),
            p99ms: round(b.p99),
          })),
        },
        null,
        2,
      );
    },
  };
}

function listRecentErrorsTool(dd: DatadogClient): GenericTool {
  const schema = z.object({
    service: z.string().optional(),
    env: z.string().optional().describe(ENV_DESC),
    sinceMinutes: z.number().min(1).max(1440).default(60),
    limit: z.number().min(1).max(50).default(15),
  });
  return {
    name: "list_recent_errors",
    description:
      "List error spans grouped by error message — the right way to answer 'any errors lately' at scale.",
    inputSchema: schema,
    run: async (input) => {
      const { service, env, sinceMinutes, limit } = schema.parse(input);
      const to = new Date();
      const from = new Date(to.getTime() - sinceMinutes * 60_000);
      const agg = await dd.aggregateSpans({
        groupBy: ["@error.message", "service"],
        query: "status:error",
        service,
        env,
        from,
        to,
        bucketLimit: limit,
        percentiles: [],
      });
      const samples = await dd.searchSpans({
        query: "status:error",
        service,
        env,
        from,
        to,
        limit: Math.min(limit * 2, 50),
      });
      const sampleByMessage = new Map<string, string>();
      for (const s of samples) {
        const msg = s.tags["error.message"] ?? "(no message)";
        if (!sampleByMessage.has(msg)) sampleByMessage.set(msg, s.traceId);
      }
      return JSON.stringify(
        {
          window: `${sinceMinutes}m`,
          filter: { service, env },
          errors: agg.buckets.map((b) => ({
            errorMessage: b.groups["@error.message"] ?? "(unknown)",
            service: b.groups.service ?? "(any)",
            count: b.count ?? 0,
            sampleTraceId:
              sampleByMessage.get(b.groups["@error.message"] ?? "") ??
              undefined,
          })),
        },
        null,
        2,
      );
    },
  };
}

function getTraceTool(dd: DatadogClient): GenericTool {
  const schema = z.object({
    traceId: z.string().describe("The trace ID to fetch."),
  });
  return {
    name: "get_trace",
    description:
      "Fetch the full span tree for one trace ID. Use after search_spans / list_recent_errors to drill in.",
    inputSchema: schema,
    run: async (input) => {
      const { traceId } = schema.parse(input);
      const trace = await dd.getTrace(traceId);
      return JSON.stringify(
        {
          traceId: trace.traceId,
          rootService: trace.rootService,
          rootResource: trace.rootResource,
          durationMs: round(trace.durationMs),
          spanCount: trace.spanCount,
          errorCount: trace.errorCount,
          tree: formatTraceTree(trace).replace(ANSI_ESCAPE_RE, ""),
        },
        null,
        2,
      );
    },
  };
}

function round(n: number | undefined): number | undefined {
  if (n === undefined) return undefined;
  return Math.round(n * 100) / 100;
}

// ANSI escape sequence stripper. The control char (0x1B) is intentional.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1B\[[0-9;]*m/g;
