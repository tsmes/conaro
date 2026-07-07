import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "@/lib/security/headers";

describe("buildSecurityHeaders", () => {
  it("always sets clickjacking, sniffing, and referrer protections", () => {
    const keys = buildSecurityHeaders(false).map((h) => h.key);
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Content-Security-Policy");
  });

  it("denies framing outright", () => {
    const xfo = buildSecurityHeaders(false).find(
      (h) => h.key === "X-Frame-Options"
    );
    expect(xfo?.value).toBe("DENY");
  });

  it("sends HSTS only in production", () => {
    const prod = buildSecurityHeaders(false).map((h) => h.key);
    const dev = buildSecurityHeaders(true).map((h) => h.key);
    expect(prod).toContain("Strict-Transport-Security");
    expect(dev).not.toContain("Strict-Transport-Security");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("blocks framing and plugins, and locks base-uri", () => {
    const csp = buildContentSecurityPolicy(false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it("allows 'unsafe-eval' only in development", () => {
    expect(buildContentSecurityPolicy(true)).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(false)).not.toContain("'unsafe-eval'");
  });
});
