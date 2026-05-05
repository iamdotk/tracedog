const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

export function table(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return `${DIM}(no rows)${RESET}\n`;
  const headers = Object.keys(rows[0]!);
  const widths = headers.map((h) =>
    Math.max(
      h.length,
      ...rows.map((r) => String(r[h] ?? "").length),
    ),
  );
  const fmt = (cells: string[]): string =>
    cells.map((c, i) => c.padEnd(widths[i]!)).join("  ");
  const out: string[] = [];
  out.push(BOLD + fmt(headers) + RESET);
  out.push(DIM + widths.map((w) => "─".repeat(w)).join("  ") + RESET);
  for (const r of rows) {
    out.push(fmt(headers.map((h) => String(r[h] ?? ""))));
  }
  return out.join("\n") + "\n";
}

export function ms(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value < 1) return `${(value * 1000).toFixed(0)}µs`;
  if (value < 1000) return `${value.toFixed(1)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}
