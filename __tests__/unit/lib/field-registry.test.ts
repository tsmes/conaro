import { describe, it, expect } from "vitest";
import { FIELD_REGISTRY } from "@/lib/db/field-registry";

describe("FIELD_REGISTRY", () => {
  it("has entries for all expected fields", () => {
    const keys = FIELD_REGISTRY.map((f) => f.key);
    expect(keys).toContain("displayName");
    expect(keys).toContain("contactEmail");
    expect(keys).toContain("realName");
    expect(keys).toContain("phone");
    expect(keys).toContain("bio");
    expect(keys).toContain("websiteUrl");
    expect(keys).toContain("socialLinks");
    expect(keys).toContain("helpers");
    expect(keys).toContain("accessibilityNeeds");
    expect(keys).toContain("tableSizePreference");
    expect(keys).toContain("notes");
    expect(keys).toContain("portfolioImages");
  });

  it("has no duplicate keys", () => {
    const keys = FIELD_REGISTRY.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses only valid sections", () => {
    const validSections = ["basic", "logistics", "portfolio"];
    for (const field of FIELD_REGISTRY) {
      expect(validSections).toContain(field.section);
    }
  });

  it("marks displayName and contactEmail as required", () => {
    const displayName = FIELD_REGISTRY.find((f) => f.key === "displayName");
    const contactEmail = FIELD_REGISTRY.find((f) => f.key === "contactEmail");
    expect(displayName?.required).toBe(true);
    expect(contactEmail?.required).toBe(true);
  });

  it("has basic, logistics, and portfolio sections", () => {
    const sections = new Set(FIELD_REGISTRY.map((f) => f.section));
    expect(sections.has("basic")).toBe(true);
    expect(sections.has("logistics")).toBe(true);
    expect(sections.has("portfolio")).toBe(true);
  });
});
