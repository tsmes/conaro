import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/helpers";

describe("hashPassword", () => {
  it("returns a bcrypt hash", async () => {
    const hash = await hashPassword("testpassword");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("returns different hashes for the same password", async () => {
    const hash1 = await hashPassword("testpassword");
    const hash2 = await hashPassword("testpassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("correctpassword", hash);
    expect(result).toBe(true);
  });

  it("returns false for incorrect password", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("wrongpassword", hash);
    expect(result).toBe(false);
  });
});
