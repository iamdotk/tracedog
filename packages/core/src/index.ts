export { Agent, testAnthropicKey, testOpenAIKey } from "./agent.js";
export type { AgentOptions } from "./agent.js";
export { DatadogClient } from "./client.js";
export {
  formatDuration,
  formatSpanLine,
  formatTraceTree,
} from "./formatter.js";
export { isValidProvider, PRESETS } from "./providers/presets.js";
export type { ProviderPreset } from "./providers/presets.js";
export type {
  Backend,
  BackendOptions,
  GenericTool,
  Provider,
  ProviderConfig,
} from "./providers/types.js";
export {
  activeAIConfig,
  configPath,
  load as loadStoredCredentials,
  loadOrEnv,
  save as saveCredentials,
} from "./storage.js";
export type {
  StoredAI,
  StoredCredentials,
  StoredProviderEntry,
} from "./storage.js";
export { buildTools } from "./tools.js";
export type {
  AggregateBucket,
  AggregateFacet,
  AggregatePercentile,
  AggregateResult,
  DatadogCredentials,
  DatadogSite,
  Span,
  SpanAggregateOptions,
  SpanSearchOptions,
  SpanSearchResult,
  Trace,
} from "./types.js";
