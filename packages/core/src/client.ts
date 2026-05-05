import type {
  AggregateResult,
  DatadogCredentials,
  Span,
  SpanAggregateOptions,
  SpanSearchOptions,
  SpanSearchResult,
  Trace,
} from "./types.js";

export class DatadogClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly creds: DatadogCredentials) {
    this.baseUrl = `https://api.${creds.site}`;
    this.headers = {
      "DD-API-KEY": creds.apiKey,
      "DD-APPLICATION-KEY": creds.appKey,
      "Content-Type": "application/json",
    };
  }

  async searchSpans(opts: SpanSearchOptions = {}): Promise<Span[]> {
    const result = await this.searchSpansWithMeta(opts);
    return result.spans;
  }

  async searchSpansWithMeta(opts: SpanSearchOptions = {}): Promise<SpanSearchResult> {
    const to = opts.to ?? new Date();
    const from = opts.from ?? new Date(to.getTime() - 15 * 60 * 1000);
    const limit = opts.limit ?? 50;

    const body = {
      data: {
        attributes: {
          filter: {
            from: from.toISOString(),
            to: to.toISOString(),
            query: buildQuery(opts),
          },
          page: { limit },
          sort: "-timestamp",
        },
        type: "search_request",
      },
    };

    const res = await fetch(`${this.baseUrl}/api/v2/spans/events/search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Datadog API ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as DatadogSpansResponse;
    const spans = (json.data ?? []).map(parseSpan);
    return {
      spans,
      truncated: spans.length >= limit,
      requestedLimit: limit,
      windowFrom: from,
      windowTo: to,
    };
  }

  async aggregateSpans(opts: SpanAggregateOptions): Promise<AggregateResult> {
    const to = opts.to ?? new Date();
    const from = opts.from ?? new Date(to.getTime() - 60 * 60 * 1000);

    const compute = [
      { type: "total", aggregation: "count" } as const,
      ...(opts.percentiles ?? ["pc50", "pc95", "pc99"]).map((p) => ({
        type: "total" as const,
        aggregation: p,
        metric: "@duration",
      })),
    ];

    const body = {
      data: {
        attributes: {
          compute,
          filter: {
            from: from.toISOString(),
            to: to.toISOString(),
            query: buildQuery(opts),
          },
          group_by: opts.groupBy.map((facet) => ({
            facet,
            limit: opts.bucketLimit ?? 20,
            sort: {
              order: "desc" as const,
              type: "measure" as const,
              aggregation: "count" as const,
            },
          })),
        },
        type: "aggregate_request",
      },
    };

    const res = await fetch(`${this.baseUrl}/api/v2/spans/analytics/aggregate`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Datadog aggregate ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as DatadogAggregateResponse;
    const buckets = (json.data?.buckets ?? []).map((b) => ({
      groups: b.by ?? {},
      count: numberFromCompute(b.computes?.c0),
      p50: numberFromCompute(b.computes?.c1),
      p95: numberFromCompute(b.computes?.c2),
      p99: numberFromCompute(b.computes?.c3),
    }));
    return { buckets, windowFrom: from, windowTo: to };
  }

  async getTrace(traceId: string): Promise<Trace> {
    const spans = await this.searchSpans({
      query: `trace_id:${traceId}`,
      limit: 1000,
    });
    if (spans.length === 0) {
      throw new Error(`No spans found for trace ${traceId}`);
    }
    return assembleTrace(traceId, spans);
  }
}

function buildQuery(opts: { service?: string; env?: string; query?: string }): string {
  const parts: string[] = [];
  if (opts.service) parts.push(`service:${opts.service}`);
  if (opts.env) parts.push(`env:${opts.env}`);
  if (opts.query) parts.push(opts.query);
  return parts.length ? parts.join(" ") : "*";
}

function numberFromCompute(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  return undefined;
}

interface DatadogAggregateResponse {
  data?: {
    buckets?: Array<{
      by?: Record<string, string>;
      computes?: Record<string, unknown>;
    }>;
  };
}

interface DatadogSpanRaw {
  id: string;
  attributes: {
    span_id: string;
    trace_id: string;
    parent_id?: string;
    service: string;
    resource_name: string;
    name: string;
    start: string;
    duration: number;
    status?: string;
    custom?: Record<string, string>;
  };
}

interface DatadogSpansResponse {
  data?: DatadogSpanRaw[];
}

function parseSpan(raw: DatadogSpanRaw): Span {
  const a = raw.attributes;
  return {
    spanId: a.span_id,
    traceId: a.trace_id,
    parentId: a.parent_id,
    service: a.service,
    resource: a.resource_name,
    operation: a.name,
    startMs: new Date(a.start).getTime(),
    durationMs: a.duration / 1_000_000,
    status: a.status === "error" ? "error" : "ok",
    tags: a.custom ?? {},
  };
}

function assembleTrace(traceId: string, spans: Span[]): Trace {
  const sorted = [...spans].sort((a, b) => a.startMs - b.startMs);
  const root = sorted[0]!;
  const end = sorted.reduce(
    (max, s) => Math.max(max, s.startMs + s.durationMs),
    0,
  );
  return {
    traceId,
    rootService: root.service,
    rootResource: root.resource,
    startMs: root.startMs,
    durationMs: end - root.startMs,
    spanCount: sorted.length,
    errorCount: sorted.filter((s) => s.status === "error").length,
    spans: sorted,
  };
}
