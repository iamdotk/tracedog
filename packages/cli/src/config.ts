import { type DatadogCredentials, loadOrEnv } from "@tracedog/core";

export function loadCredentials(): DatadogCredentials {
  return loadOrEnv().datadog;
}
