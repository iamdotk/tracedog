import { DatadogClient, formatTraceTree } from "@iamdotk/tracedog-core";
import { loadCredentials } from "../config.js";

export async function runShow(traceId: string): Promise<void> {
  const client = new DatadogClient(loadCredentials());
  const trace = await client.getTrace(traceId);
  process.stdout.write(formatTraceTree(trace) + "\n");
}
