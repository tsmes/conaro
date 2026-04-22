import { describe, it, expect } from "vitest";
import { validateProfileForEvent } from "@/lib/applications/validation";
import type { FieldRequirements } from "@/lib/db/schema/events";

const baseProfile = { displayName: "Artist" };
const baseArtistProfile = {
  realName: null,
  contactEmail: "artist@test.com",
  phone: null,
  bio: null,
  websiteUrl: null,
  socialLinks: null,
  helpers: 0,
  accessibilityNeeds: null,
  notes: null,
};

const allNotRequested: FieldRequirements = {
  displayName: "not_requested",
  realName: "not_requested",
  contactEmail: "not_requested",
  phone: "not_requested",
  bio: "not_requested",
  websiteUrl: "not_requested",
  socialLinks: "not_requested",
  helpers: "not_requested",
  accessibilityNeeds: "not_requested",
  notes: "not_requested",
  portfolioImages: "not_requested",
};

describe("validateProfileForEvent", () => {
  it("returns valid when all required fields are filled", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      displayName: "required",
      contactEmail: "required",
    };

    const result = validateProfileForEvent(
      requirements,
      0,
      baseProfile,
      baseArtistProfile,
      0
    );

    expect(result.valid).toBe(true);
  });

  it("returns missing fields when required text field is empty", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      displayName: "required",
      contactEmail: "required",
      bio: "required",
    };

    const result = validateProfileForEvent(
      requirements,
      0,
      baseProfile,
      baseArtistProfile,
      0
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missingFields).toHaveLength(1);
      expect(result.missingFields[0].key).toBe("bio");
      expect(result.missingFields[0].section).toBe("basic");
    }
  });

  it("treats helpers=0 as filled (number type)", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      helpers: "required",
    };

    const result = validateProfileForEvent(
      requirements,
      0,
      baseProfile,
      { ...baseArtistProfile, helpers: 0 },
      0
    );

    expect(result.valid).toBe(true);
  });

  it("treats helpers=null as missing", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      helpers: "required",
    };

    const result = validateProfileForEvent(
      requirements,
      0,
      baseProfile,
      { ...baseArtistProfile, helpers: null },
      0
    );

    expect(result.valid).toBe(false);
  });

  it("checks portfolioImages with minPortfolioImages", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      portfolioImages: "required",
    };

    // Has 2 images but needs 3
    const result = validateProfileForEvent(
      requirements,
      3,
      baseProfile,
      baseArtistProfile,
      2
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missingFields[0].key).toBe("portfolioImages");
      expect(result.missingFields[0].label).toContain("at least 3");
    }
  });

  it("passes portfolioImages when count meets minimum", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      portfolioImages: "required",
    };

    const result = validateProfileForEvent(
      requirements,
      3,
      baseProfile,
      baseArtistProfile,
      5
    );

    expect(result.valid).toBe(true);
  });

  it("ignores optional and not_requested fields", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      bio: "optional",
      phone: "not_requested",
    };

    const result = validateProfileForEvent(
      requirements,
      0,
      baseProfile,
      baseArtistProfile,
      0
    );

    expect(result.valid).toBe(true);
  });

  it("returns valid when fieldRequirements is null", () => {
    const result = validateProfileForEvent(
      null,
      0,
      baseProfile,
      baseArtistProfile,
      0
    );

    expect(result.valid).toBe(true);
  });

  it("returns multiple missing fields", () => {
    const requirements: FieldRequirements = {
      ...allNotRequested,
      displayName: "required",
      contactEmail: "required",
      bio: "required",
      phone: "required",
    };

    const result = validateProfileForEvent(
      requirements,
      0,
      baseProfile,
      baseArtistProfile,
      0
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missingFields).toHaveLength(2);
      const keys = result.missingFields.map((f) => f.key);
      expect(keys).toContain("bio");
      expect(keys).toContain("phone");
    }
  });
});
