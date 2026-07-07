import { describe, expect, it } from "vitest";
import path from "path";

import { resolveWithinDir } from "@/lib/storage/safe-path";

const BASE = path.resolve("/app/uploads");

describe("resolveWithinDir", () => {
  it("resolves a normal nested key inside the base", () => {
    expect(resolveWithinDir(BASE, "portfolios", "abc.webp")).toBe(
      path.join(BASE, "portfolios", "abc.webp")
    );
  });

  it("allows the base directory itself (empty segments)", () => {
    expect(resolveWithinDir(BASE)).toBe(BASE);
  });

  it("rejects a sibling directory sharing the base name as a prefix", () => {
    // /app/uploads + ../uploads-old/dump.sql -> /app/uploads-old/dump.sql,
    // which string-startsWith /app/uploads but is NOT inside it.
    expect(resolveWithinDir(BASE, "..", "uploads-old", "dump.sql")).toBeNull();
  });

  it("rejects parent-directory traversal", () => {
    expect(resolveWithinDir(BASE, "..", "..", "etc", "passwd")).toBeNull();
  });

  it("rejects an absolute-path segment that escapes the base", () => {
    expect(resolveWithinDir(BASE, "/etc/passwd")).toBeNull();
  });

  it("rejects a traversal embedded mid-key", () => {
    expect(resolveWithinDir(BASE, "portfolios/../../secret")).toBeNull();
  });
});
