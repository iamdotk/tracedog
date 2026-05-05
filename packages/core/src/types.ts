export type DatadogSite =
  | "datadoghq.com"
  | "datadoghq.eu"
  | "us3.datadoghq.com"
  | "us5.datadoghq.com"
  | "ap1.datadoghq.com"
  | "ddog-gov.com";


export interface DatadogCredentials {
  apiKey: string;
  appKey: string;
  site: DatadogSite;
}

export interface SpanSearchOptions {
  query?: string;
  service?: string;
  env?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface SpanSearchResult {
  spans: Span[];
  truncated: boolean;
  requestedLimit: number;
  windowFrom: Date;
  windowTo: Date;
}

export type AggregateFacet =
  | "service"
  | "resource_name"
  | "operation_name"
  | "env"
  | "status"
  | "@error.message"
  | "@error.type"
  | "@http.status_code";

export type AggregatePercentile = "pc50" | "pc75" | "pc90" | "pc95" | "pc99";

export interface SpanAggregateOptions {
  query?: string;
  service?: string;
  env?: string;
  from?: Date;
  to?: Date;
  groupBy: AggregateFacet[];
  bucketLimit?: number;
  percentiles?: AggregatePercentile[];
}

export interface AggregateBucket {
  groups: Record<string, string>;
  count?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

export interface AggregateResult {
  buckets: AggregateBucket[];
  windowFrom: Date;
  windowTo: Date;
}

export interface Span {
  spanId: string;
  traceId: string;
  parentId?: string;
  service: string;
  resource: string;
  operation: string;
  startMs: number;
  durationMs: number;
  status: "ok" | "error";
  tags: Record<string, string>;
}

export interface Trace {
  traceId: string;
  rootService: string;
  rootResource: string;
  startMs: number;
  durationMs: number;
  spanCount: number;
  errorCount: number;
  spans: Span[];
}
