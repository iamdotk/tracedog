import { type DatadogCredentials, loadOrEnv } from "@iamdotk/tracedog-core";

export function loadCredentials(): DatadogCredentials {
  return loadOrEnv().datadog;
}
