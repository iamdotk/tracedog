import { describe, expect, it } from "vitest";
import { formatDuration } from "../src/formatter.js";

describe("formatDuration", () => {
  it("formats microseconds", () => {
    expect(formatDuration(0.5)).toBe("500µs");
  });
  it("formats milliseconds", () => {
    expect(formatDuration(42.7)).toBe("42.7ms");
  });
  it("formats seconds", () => {
    expect(formatDuration(1234)).toBe("1.23s");
  });
});
