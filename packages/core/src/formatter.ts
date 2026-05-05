import type { Span, Trace } from "./types.js";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatSpanLine(span: Span): string {
  const status = span.status === "error" ? `${RED}✖${RESET}` : `${GREEN}✓${RESET}`;
  const dur = `${YELLOW}${formatDuration(span.durationMs)}${RESET}`;
  const svc = `${CYAN}${span.service}${RESET}`;
  return `${status} ${svc} ${DIM}${span.operation}${RESET} ${span.resource} ${dur}`;
}

export function formatTraceTree(trace: Trace): string {
  const lines: string[] = [];
  lines.push(
    `Trace ${trace.traceId} — ${trace.spanCount} spans, ${formatDuration(trace.durationMs)}, ${trace.errorCount} errors`,
  );
  const byParent = new Map<string | undefined, Span[]>();
  for (const s of trace.spans) {
    const list = byParent.get(s.parentId) ?? [];
    list.push(s);
    byParent.set(s.parentId, list);
  }
  const roots = byParent.get(undefined) ?? [trace.spans[0]!];
  const walk = (span: Span, depth: number): void => {
    lines.push("  ".repeat(depth) + formatSpanLine(span));
    for (const child of byParent.get(span.spanId) ?? []) walk(child, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  return lines.join("\n");
}
