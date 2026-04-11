import { describe, it, expect } from "vitest";
import { basicInfoSchema, logisticsSchema } from "@/lib/validations/profile";

describe("basicInfoSchema", () => {
  const validInput = {
    displayName: "Test Artist",
    contactEmail: "artist@example.com",
  };

  it("accepts valid input with required fields only", () => {
    const result = basicInfoSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with all fields", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      realName: "Real Name",
      phone: "+1234567890",
      bio: "A short bio",
      websiteUrl: "https://example.com",
      socialLinks: "@artist on instagram",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty display name", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      displayName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid contact email", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      contactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects bio over 2000 characters", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      bio: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty website URL", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      websiteUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid website URL", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      websiteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects URL without http/https prefix", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      websiteUrl: "https:artdeck/@wsp",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid http URL", () => {
    const result = basicInfoSchema.safeParse({
      ...validInput,
      websiteUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("logisticsSchema", () => {
  it("accepts valid input", () => {
    const result = logisticsSchema.safeParse({
      helpers: 2,
      accessibilityNeeds: "Wheelchair access",
      tableSizePreference: "2m x 1m",
      notes: "Some notes",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty input with defaults", () => {
    const result = logisticsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.helpers).toBe(0);
    }
  });

  it("coerces string helpers to number", () => {
    const result = logisticsSchema.safeParse({ helpers: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.helpers).toBe(3);
    }
  });

  it("rejects helpers below 0", () => {
    const result = logisticsSchema.safeParse({ helpers: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects helpers above 5", () => {
    const result = logisticsSchema.safeParse({ helpers: 6 });
    expect(result.success).toBe(false);
  });
});
