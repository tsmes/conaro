import { describe, it, expect } from "vitest";
import { initialsFor } from "@/lib/auth/initials";

describe("initialsFor", () => {
  it("takes the first letter of each of the first two name tokens", () => {
    expect(initialsFor({ name: "Elena Rodriguez" })).toBe("ER");
  });

  it("uppercases and caps at two letters even for longer names", () => {
    expect(initialsFor({ name: "jane maria doe" })).toBe("JM");
  });

  it("returns a single initial for single-word names", () => {
    expect(initialsFor({ name: "Cher" })).toBe("C");
  });

  it("falls back to the email local part when no name is set", () => {
    expect(initialsFor({ email: "sam@example.com" })).toBe("S");
  });

  it("ignores a blank name in favor of the email fallback", () => {
    expect(initialsFor({ name: "   ", email: "alex@x.co" })).toBe("A");
  });

  it("returns '?' when neither name nor email is available", () => {
    expect(initialsFor({})).toBe("?");
  });
});
